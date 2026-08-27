"""
ChronoPhys-Vision: Industrial Protocol & Closed-Loop Actuation Module
Features:
- Modbus TCP Server & Client Simulation (Holding Registers & Coils for VFD Throttle & Trip Relays)
- MQTT Telemetry Publisher for Real-Time Industrial SCADA / Cloud Brokering
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("IndustrialIO")


class ModbusTCPAdapter:
    """
    Industrial Modbus TCP interface.
    Manages VFD motor control registers and emergency trip relay coils.
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 5020):
        self.host = host
        self.port = port
        self.is_connected = False

        # Modbus Data Table (Simulated Register & Coil Store)
        self.holding_registers = {
            40001: 1800,   # Machine RPM (1800 RPM)
            40002: 100,    # VFD Speed Reference (0 - 100%)
            40003: 0,      # Vibration Velocity RMS (mm/s * 100)
            40004: 0,      # ISO Zone (0=A, 1=B, 2=C, 3=D)
        }
        self.coils = {
            1: False,      # Coil 00001: Emergency Trip Relay
            2: False,      # Coil 00002: Active Damping Brake
        }

    def update_telemetry(self, v_rms_mms: float, iso_zone_idx: int, vfd_throttle_pct: float) -> None:
        """Updates internal Modbus registers and coils."""
        self.holding_registers[40002] = int(np_clip := max(0, min(100, int(vfd_throttle_pct))))
        self.holding_registers[40003] = int(v_rms_mms * 100.0)
        self.holding_registers[40004] = int(iso_zone_idx)

        # Trigger Emergency Trip Relay if in Zone D (index 3)
        is_zone_d = (iso_zone_idx == 3)
        self.coils[1] = is_zone_d
        self.coils[2] = (iso_zone_idx >= 2)

    def read_register(self, address: int) -> int:
        """Reads holding register value."""
        return self.holding_registers.get(address, 0)

    def read_coil(self, address: int) -> bool:
        """Reads coil state."""
        return self.coils.get(address, False)

    def get_status_payload(self) -> Dict[str, Any]:
        """Returns JSON status snapshot for web telemetry."""
        return {
            "protocol": "MODBUS_TCP",
            "host": f"{self.host}:{self.port}",
            "registers": {
                "HR40001_RPM": self.holding_registers[40001],
                "HR40002_VFD_Throttle_Pct": self.holding_registers[40002],
                "HR40003_VRMS_Scaled": self.holding_registers[40003],
                "HR40004_ISO_Zone_Idx": self.holding_registers[40004]
            },
            "coils": {
                "Coil00001_Trip_Relay": self.coils[1],
                "Coil00002_Damping_Brake": self.coils[2]
            }
        }


class MQTTTelemetryPublisher:
    """
    Asynchronous MQTT client for streaming vibration spectra and ISO alarms to industrial brokers.
    """

    def __init__(
        self,
        broker_host: str = "127.0.0.1",
        broker_port: int = 1883,
        topic: str = "industrial/chronophys/telemetry"
    ):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.topic = topic
        self.connected = False
        self.client = None

        self._init_client()

    def _init_client(self) -> None:
        """Attempts to initialize paho-mqtt client if available."""
        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client(client_id="ChronoPhysVision_Publisher", clean_session=True)
            # Configure non-blocking connection attempt
            self.client.connect_async(self.broker_host, self.broker_port, keepalive=30)
            self.client.loop_start()
            self.connected = True
        except Exception as e:
            # Fallback mock mode if external MQTT broker is not reachable locally
            self.connected = False
            self.client = None

    def publish_telemetry(self, telemetry: Dict[str, Any]) -> None:
        """Publishes JSON telemetry payload to MQTT topic."""
        if not self.connected or self.client is None:
            return

        try:
            payload_str = json.dumps({
                "timestamp": datetime.now().isoformat(),
                "dominant_freq_hz": telemetry.get("dominant_frequency_hz", 0.0),
                "v_rms_mms": telemetry.get("vibration_velocity_rms_mms", 0.0),
                "iso_zone": telemetry.get("iso_diagnostics", {}).get("iso_zone", "ZONE_A"),
                "plc_throttle": telemetry.get("plc", {}).get("plc_register_40001_throttle", 100.0)
            })
            self.client.publish(self.topic, payload_str, qos=0)
        except Exception:
            pass

    def stop(self) -> None:
        """Stops MQTT client loop cleanly."""
        if self.client is not None:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass
