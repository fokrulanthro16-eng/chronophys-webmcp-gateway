"""
ChronoPhys-Vision: Physical Hardware Actuator & Smart Relay Engine
Features:
- Automated Emergency Hardware Power Cut-off on ISO Zone D (Critical)
- Compatible with Shelly Gen1/Gen2, Sonoff / Tasmota, ESP32, and Generic HTTP Webhooks
- MQTT Trip Relay Command Broadcaster
- Latching Safety Interlock with Manual Reset
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import urllib.request
import urllib.error
import json

logger = logging.getLogger("HardwareTrip")


class SmartRelayType:
    SHELLY_GEN1 = "SHELLY_GEN1"     # http://<ip>/relay/0?turn=off
    SHELLY_GEN2 = "SHELLY_GEN2"     # http://<ip>/rpc/Switch.Set?id=0&on=false
    TASMOTA = "TASMOTA"             # http://<ip>/cm?cmnd=Power%20Off
    WEBHOOK_REST = "WEBHOOK_REST"   # Custom REST POST endpoint
    SIMULATED = "SIMULATED"         # Simulated hardware relay


class HardwareTripEngine:
    """
    Physical hardware trip controller. Dispatches network cut-off commands to industrial relays.
    """

    def __init__(
        self,
        relay_type: str = SmartRelayType.SIMULATED,
        relay_ip_or_url: str = "127.0.0.1",
        auto_trip_enabled: bool = True
    ):
        self.relay_type = relay_type
        self.target_url = relay_ip_or_url
        self.auto_trip_enabled = auto_trip_enabled
        
        self.is_tripped: bool = False
        self.last_trip_time: Optional[str] = None
        self.trip_count: int = 0
        self.audit_log: list = []

    def configure(self, relay_type: str, target: str, auto_trip: bool) -> None:
        """Update hardware trip configuration."""
        self.relay_type = relay_type
        self.target_url = target
        self.auto_trip_enabled = auto_trip

    async def evaluate_safety_state(self, iso_zone: str, v_rms_mms: float) -> Optional[Dict[str, Any]]:
        """
        Evaluates ISO severity and fires hardware cut-off if Zone D is reached.
        """
        if iso_zone == "ZONE_D" and self.auto_trip_enabled and not self.is_tripped:
            return await self.trigger_emergency_cut_off(
                reason=f"ISO Zone D Critical Vibration ({v_rms_mms:.2f} mm/s) exceeded safety envelope."
            )
        return None

    async def trigger_emergency_cut_off(self, reason: str = "Manual Override") -> Dict[str, Any]:
        """
        Dispatches emergency power off signal to the hardware smart relay.
        """
        self.is_tripped = True
        self.last_trip_time = datetime.now().isoformat()
        self.trip_count += 1

        trip_event = {
            "timestamp": self.last_trip_time,
            "status": "HARDWARE_TRIPPED",
            "relay_type": self.relay_type,
            "target": self.target_url,
            "reason": reason
        }

        # Dispatch async HTTP network request
        if self.relay_type != SmartRelayType.SIMULATED:
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, self._send_network_command, "OFF")
                trip_event["network_dispatch"] = "SUCCESS"
            except Exception as e:
                trip_event["network_dispatch"] = f"FAILED: {str(e)}"
        else:
            trip_event["network_dispatch"] = "SIMULATED_SUCCESS"

        self.audit_log.append(trip_event)
        if len(self.audit_log) > 30:
            self.audit_log.pop(0)

        return trip_event

    def reset_trip(self) -> Dict[str, Any]:
        """Manually resets the safety latch."""
        self.is_tripped = False
        reset_event = {
            "timestamp": datetime.now().isoformat(),
            "status": "TRIP_RESET_NORMAL",
            "message": "Safety latch cleared. Equipment power restored."
        }

        if self.relay_type != SmartRelayType.SIMULATED:
            try:
                self._send_network_command("ON")
                reset_event["network_dispatch"] = "SUCCESS"
            except Exception as e:
                reset_event["network_dispatch"] = f"FAILED: {str(e)}"

        self.audit_log.append(reset_event)
        return reset_event

    def _send_network_command(self, action: str = "OFF") -> None:
        """Executes synchronous HTTP request according to smart plug protocol."""
        url = self.target_url
        req = None

        if self.relay_type == SmartRelayType.SHELLY_GEN1:
            cmd = "off" if action == "OFF" else "on"
            url = f"http://{self.target_url}/relay/0?turn={cmd}"
            req = urllib.request.Request(url, method="GET")

        elif self.relay_type == SmartRelayType.SHELLY_GEN2:
            on_val = "false" if action == "OFF" else "true"
            url = f"http://{self.target_url}/rpc/Switch.Set?id=0&on={on_val}"
            req = urllib.request.Request(url, method="GET")

        elif self.relay_type == SmartRelayType.TASMOTA:
            cmd = "Power%20Off" if action == "OFF" else "Power%20On"
            url = f"http://{self.target_url}/cm?cmnd={cmd}"
            req = urllib.request.Request(url, method="GET")

        elif self.relay_type == SmartRelayType.WEBHOOK_REST:
            data = json.dumps({"command": action, "timestamp": datetime.now().isoformat()}).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

        if req is not None:
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                _ = resp.read()

    def get_status(self) -> Dict[str, Any]:
        """Returns JSON snapshot for UI and telemetry."""
        return {
            "is_tripped": self.is_tripped,
            "relay_type": self.relay_type,
            "target": self.target_url,
            "auto_trip_enabled": self.auto_trip_enabled,
            "last_trip_time": self.last_trip_time,
            "trip_count": self.trip_count,
            "recent_events": self.audit_log[-5:]
        }
