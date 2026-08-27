"""
ChronoPhys-Vision 3.0: 30-Second Competition Demo Video Recording Engine
Features:
- Deterministic 900-Frame Synchronized Side-by-Side MP4 Recording (30s @ 30 FPS)
- Left Canvas: Raw Optical Sensor + Dynamic Auto-Lock Bounding Boxes
- Right Canvas: Phase-Based EVM Magnified Stream + Dynamic Colormap
- Dual Semi-Transparent Telemetry HUDs (Top Header & Bottom Metric Banner)
- Thread-Safe Buffer Management, Clean Flushing, and Automated Browser Download Packaging
"""

import os
import time
import threading
import queue
from typing import Optional, Dict, Any
import cv2
import numpy as np


class DemoRecordingEngine:
    """
    High-fidelity 30-second side-by-side video recording engine with industrial telemetry HUD.
    """

    def __init__(self, output_dir: str = "recordings"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

        self.canonical_filename: str = os.path.join(self.output_dir, "chronophys_30s_competition_demo.mp4")
        self.is_recording: bool = False
        self.start_time: float = 0.0
        self.target_duration: float = 30.0
        self.target_frames: int = 900
        self.fps: float = 30.0
        self.frames_recorded: int = 0

        self.video_writer: Optional[cv2.VideoWriter] = None
        self._lock = threading.Lock()

    def start_recording(self, duration_sec: float = 30.0, fps: float = 30.0) -> Dict[str, Any]:
        """Initiates recording session."""
        with self._lock:
            self.target_duration = max(5.0, min(float(duration_sec), 60.0))
            self.fps = fps
            self.target_frames = int(self.target_duration * self.fps)
            self.frames_recorded = 0
            self.start_time = time.time()

            if self.video_writer is not None:
                self.video_writer.release()
                self.video_writer = None

            # Remove previous file if exists to prevent stale download
            if os.path.exists(self.canonical_filename):
                try:
                    os.remove(self.canonical_filename)
                except Exception:
                    pass

            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            self.video_writer = cv2.VideoWriter(
                self.canonical_filename,
                fourcc,
                self.fps,
                (1280, 480)
            )

            self.is_recording = True
            return {
                "status": "RECORDING_STARTED",
                "duration_seconds": self.target_duration,
                "target_frames": self.target_frames,
                "output_file": self.canonical_filename
            }

    def write_frame(self, raw_frame: np.ndarray, mag_frame: np.ndarray, telemetry: Dict[str, Any]) -> None:
        """Composites side-by-side feeds, burns top and bottom HUD banners, and writes frame."""
        with self._lock:
            if not self.is_recording or self.video_writer is None:
                return

            elapsed = time.time() - self.start_time
            if self.frames_recorded >= self.target_frames or elapsed >= (self.target_duration + 1.0):
                self._finalize_recording()
                return

            # Resize both to exact 640x480
            rf = cv2.resize(raw_frame, (640, 480))
            mf = cv2.resize(mag_frame, (640, 480))
            canvas = np.hstack([rf, mf])

            # 1. Top HUD Banner (0 to 36 px)
            top_hud = canvas.copy()
            cv2.rectangle(top_hud, (0, 0), (1280, 36), (8, 12, 22), -1)
            canvas = cv2.addWeighted(top_hud, 0.82, canvas, 0.18, 0)

            cv2.putText(canvas, "ChronoPhys-Vision 3.0 | Physical AI & Digital Twin", (14, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 240, 255), 2)
            cv2.putText(canvas, "OpenCV AI Competition 2026", (960, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (148, 163, 184), 1)

            # 2. Bottom HUD Telemetry Banner (436 to 480 px)
            bot_hud = canvas.copy()
            cv2.rectangle(bot_hud, (0, 436), (1280, 480), (8, 12, 22), -1)
            canvas = cv2.addWeighted(bot_hud, 0.88, canvas, 0.12, 0)

            # Telemetry Metrics
            fft = telemetry.get("fft", {})
            iso = telemetry.get("iso", {})
            pinn = telemetry.get("pinn_fatigue", {})
            multi = telemetry.get("multi_roi", {})
            phase_info = multi.get("phase_analysis", {}).get("de_vs_nde", {})

            dom_freq = fft.get("dominant_frequency_hz", 0.0)
            v_rms = fft.get("vibration_velocity_rms_mms", 0.0)
            zone = iso.get("iso_zone", "ZONE_A")
            phase_deg = phase_info.get("phase_deg", 0.0)
            rul_hrs = pinn.get("remaining_useful_life_hours", 99999.0)

            zone_col = (0, 255, 0) if zone == "ZONE_A" else ((255, 200, 0) if zone == "ZONE_B" else ((0, 165, 255) if zone == "ZONE_C" else (0, 0, 255)))

            cv2.putText(canvas, f"f0: {dom_freq:.2f} Hz", (15, 462), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1)
            cv2.putText(canvas, f"v_RMS: {v_rms:.3f} mm/s [{zone}]", (180, 462), cv2.FONT_HERSHEY_SIMPLEX, 0.48, zone_col, 2)
            cv2.putText(canvas, f"Phase: {phase_deg:+.1f} deg", (490, 462), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 100, 255), 1)
            cv2.putText(canvas, f"RUL: {rul_hrs:,.0f}h", (700, 462), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (100, 255, 100), 1)
            
            # Countdown & Frame Counter
            rem_sec = max(0.0, self.target_duration - elapsed)
            cv2.putText(canvas, f"REC [{elapsed:.1f}s / {self.target_duration:.0f}s] ({self.frames_recorded+1}/{self.target_frames})", (950, 462), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 0, 255), 2)

            # Progress Bar across very bottom (477-480 px)
            prog_ratio = min(1.0, float(self.frames_recorded + 1) / float(self.target_frames))
            prog_w = int(1280 * prog_ratio)
            cv2.rectangle(canvas, (0, 477), (prog_w, 480), (0, 240, 255), -1)

            self.video_writer.write(canvas)
            self.frames_recorded += 1

    def _finalize_recording(self) -> None:
        """Internal helper to close the video writer and flush file."""
        self.is_recording = False
        if self.video_writer is not None:
            self.video_writer.release()
            self.video_writer = None

    def stop_recording(self) -> Dict[str, Any]:
        """Manually terminates recording."""
        with self._lock:
            self._finalize_recording()
            return {
                "status": "RECORDING_COMPLETED",
                "frames_recorded": self.frames_recorded,
                "output_file": self.canonical_filename
            }

    def get_status(self) -> Dict[str, Any]:
        """Returns real-time status and progress percentage."""
        with self._lock:
            if not self.is_recording:
                file_exists = os.path.exists(self.canonical_filename) and os.path.getsize(self.canonical_filename) > 1000
                return {
                    "is_recording": False,
                    "elapsed_seconds": 0.0,
                    "target_duration": self.target_duration,
                    "progress_pct": 100.0 if file_exists else 0.0,
                    "frames_recorded": self.frames_recorded,
                    "target_frames": self.target_frames,
                    "file_ready": file_exists
                }

            elapsed = time.time() - self.start_time
            if self.frames_recorded >= self.target_frames or elapsed >= (self.target_duration + 0.5):
                self._finalize_recording()
                return {
                    "is_recording": False,
                    "elapsed_seconds": self.target_duration,
                    "target_duration": self.target_duration,
                    "progress_pct": 100.0,
                    "frames_recorded": self.frames_recorded,
                    "target_frames": self.target_frames,
                    "file_ready": True
                }

            progress = min(100.0, (float(self.frames_recorded) / float(self.target_frames)) * 100.0)
            return {
                "is_recording": True,
                "elapsed_seconds": round(elapsed, 1),
                "target_duration": self.target_duration,
                "progress_pct": round(progress, 1),
                "frames_recorded": self.frames_recorded,
                "target_frames": self.target_frames,
                "file_ready": False
            }
