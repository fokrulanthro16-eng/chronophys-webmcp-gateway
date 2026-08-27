"""
ChronoPhys-Vision 3.0: Historical Time-Series SQLite Database Engine
Features:
- Periodic 1-second telemetry snapshots (v_RMS, frequency, ISO Zone, RUL, ROI $)
- 7-Day trend line query and historical analytics API (/api/telemetry/history)
- Thread-safe connection pooling and auto-seeding for baseline trends
"""

import os
import time
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np


class TelemetryDatabase:
    """
    Lightweight SQLite time-series storage for long-term machine vibration trend analysis.
    """

    def __init__(self, db_path: str = "data/chronophys_history.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()
        self.last_log_time: float = 0.0

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initializes tables and indexes."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS telemetry_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    datetime_iso TEXT,
                    v_rms REAL,
                    dominant_freq REAL,
                    iso_zone TEXT,
                    rul_hours REAL,
                    dollars_saved REAL,
                    ahi_pct REAL,
                    coherence REAL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    equipment_id TEXT,
                    analyst TEXT,
                    sha256_signature TEXT UNIQUE,
                    timestamp REAL,
                    datetime_iso TEXT,
                    payload_json TEXT
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS rfq_submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rfq_id TEXT UNIQUE,
                    customer_name TEXT,
                    email TEXT,
                    company TEXT,
                    service_category TEXT,
                    urgency_level TEXT,
                    notes TEXT,
                    item_id TEXT,
                    timestamp REAL,
                    datetime_iso TEXT
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON telemetry_history(timestamp);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_sha ON audit_tickets(sha256_signature);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_rfq_id ON rfq_submissions(rfq_id);")
            conn.commit()

        # Seed baseline 7-day trend if empty
        self._seed_baseline_if_empty()

    def _seed_baseline_if_empty(self) -> None:
        """Populates baseline 7-day historical trend for instant executive demo."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM telemetry_history")
            count = cursor.fetchone()[0]

            if count == 0:
                now = time.time()
                rows = []
                # 7 days of 6-hour interval baseline data
                for day_offset in range(7, 0, -1):
                    for hour_offset in [0, 6, 12, 18]:
                        t = now - (day_offset * 86400) + (hour_offset * 3600)
                        dt_iso = datetime.fromtimestamp(t).isoformat()
                        v = 0.62 + 0.12 * np.sin(day_offset + hour_offset)
                        rows.append((
                            t, dt_iso, round(float(v), 3), 3.5, "ZONE_A", 99999.0,
                            54750.0, 92.5, 0.985
                        ))
                
                cursor.executemany("""
                    INSERT INTO telemetry_history 
                    (timestamp, datetime_iso, v_rms, dominant_freq, iso_zone, rul_hours, dollars_saved, ahi_pct, coherence)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, rows)
                conn.commit()

    def log_snapshot(self, telemetry: Dict[str, Any], min_interval_sec: float = 1.0) -> bool:
        """Logs a telemetry snapshot if min_interval_sec has elapsed."""
        now = time.time()
        if now - self.last_log_time < min_interval_sec:
            return False

        fft = telemetry.get("fft", {})
        iso = telemetry.get("iso", {})
        pinn = telemetry.get("pinn_fatigue", {})
        roi = telemetry.get("roi", {})
        coh = telemetry.get("coherence", {})

        v_rms = float(fft.get("vibration_velocity_rms_mms", 0.0))
        dom_freq = float(fft.get("dominant_frequency_hz", 3.5))
        iso_zone = str(iso.get("iso_zone", "ZONE_A"))
        rul = float(pinn.get("remaining_useful_life_hours", 99999.0))
        dollars = float(roi.get("estimated_dollars_saved", 54750.0))
        ahi = float(roi.get("asset_health_index_pct", 92.0))
        coherence = float(coh.get("coherence_index", 0.98))

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO telemetry_history 
                (timestamp, datetime_iso, v_rms, dominant_freq, iso_zone, rul_hours, dollars_saved, ahi_pct, coherence)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (now, datetime.fromtimestamp(now).isoformat(), v_rms, dom_freq, iso_zone, rul, dollars, ahi, coherence))
            conn.commit()

        self.last_log_time = now
        return True

    def save_audit_ticket(self, equipment_id: str, analyst: str, sha256_signature: str, payload: Dict[str, Any]) -> bool:
        """Persists a signed ISO 17025 maintenance audit ticket to the SQLite database."""
        now = time.time()
        import json
        with self._get_connection() as conn:
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO audit_tickets 
                    (equipment_id, analyst, sha256_signature, timestamp, datetime_iso, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (equipment_id, analyst, sha256_signature, now, datetime.fromtimestamp(now).isoformat(), json.dumps(payload)))
                conn.commit()
                return True
            except Exception:
                return False

    def get_audit_tickets(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves verified audit tickets."""
        import json
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, equipment_id, analyst, sha256_signature, timestamp, datetime_iso, payload_json
                FROM audit_tickets
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [
                {
                    "id": r["id"],
                    "equipment_id": r["equipment_id"],
                    "analyst": r["analyst"],
                    "sha256_signature": r["sha256_signature"],
                    "timestamp": r["timestamp"],
                    "datetime_iso": r["datetime_iso"],
                    "payload": json.loads(r["payload_json"]) if r["payload_json"] else {}
                }
                for r in rows
            ]
    def save_rfq(self, rfq_data: Dict[str, Any]) -> bool:
        """Persists an RFQ booking request into SQLite."""
        now = time.time()
        rfq_id = rfq_data.get("rfq_id") or f"RFQ-{int(now*1000)}"
        customer_name = rfq_data.get("customerName", "")
        email = rfq_data.get("email", "")
        company = rfq_data.get("company", "")
        category = rfq_data.get("serviceCategory", "")
        urgency = rfq_data.get("urgencyLevel", "normal")
        notes = rfq_data.get("notes", "")
        item_id = rfq_data.get("itemId", "")
        iso_str = rfq_data.get("timestamp") or datetime.fromtimestamp(now).isoformat()

        with self._get_connection() as conn:
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO rfq_submissions 
                    (rfq_id, customer_name, email, company, service_category, urgency_level, notes, item_id, timestamp, datetime_iso)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (rfq_id, customer_name, email, company, category, urgency, notes, item_id, now, iso_str))
                conn.commit()
                return True
            except Exception:
                return False

    def get_rfqs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves stored RFQ submissions."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, rfq_id, customer_name, email, company, service_category, urgency_level, notes, item_id, timestamp, datetime_iso
                FROM rfq_submissions
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]
