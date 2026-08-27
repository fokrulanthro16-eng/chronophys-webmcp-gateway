"""
ChronoPhys-Vision: Autonomous Closed-Loop Decision Engine & Agentic Controller
Integrates:
- ISO 10816-3 Severity Evaluation
- Modbus TCP & VFD Actuator Throttle Regulation
- MCP (Model Context Protocol) compatibility
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from enum import Enum
import numpy as np


class IndustrialAgentController:
    """
    Autonomous Closed-Loop Perception-Decision-Action Engine.
    Monitors vibration velocity RMS (v_RMS) and modal harmonics,
    evaluates mechanical resonance danger, and regulates simulated PLC/VFD throttle.
    """

    def __init__(
        self,
        critical_resonance_band: Tuple[float, float] = (3.0, 4.5),
        max_allowable_vrms_mms: float = 2.8,
        kp: float = 0.5,
        ki: float = 0.08,
        kd: float = 0.04
    ):
        self.resonance_band = critical_resonance_band
        self.max_vrms = max_allowable_vrms_mms

        # PID Controller state for actuator damping
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self._integral = 0.0
        self._last_error = 0.0

        # Actuator / PLC State (0.0% to 100.0% throttle)
        self.actuator_throttle_pct: float = 100.0
        self.emergency_trip_active: bool = False

        self.action_history: List[Dict[str, Any]] = []
        self.max_history = 50

    def evaluate_telemetry(self, telemetry: Dict[str, Any], iso_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Perception-Decision-Action control step.
        """
        dominant_freq = telemetry.get("dominant_frequency_hz", 0.0)
        v_rms = telemetry.get("vibration_velocity_rms_mms", 0.0)
        snr_db = telemetry.get("peak_snr_db", 0.0)

        iso_zone = iso_data.get("iso_zone", "ZONE_A") if iso_data else "ZONE_A"
        is_resonant = (self.resonance_band[0] <= dominant_freq <= self.resonance_band[1]) and (snr_db > 6.0)

        # Closed-loop PID throttle logic
        target_vrms = self.max_vrms * 0.5
        error = v_rms - target_vrms

        self._integral = np.clip(self._integral + error, -10.0, 10.0)
        derivative = error - self._last_error
        self._last_error = error

        pid_adjustment = (self.kp * error + self.ki * self._integral + self.kd * derivative) * 15.0

        suggested_action = "MAINTAIN"
        decision_note = "Vibration velocity nominal (ISO Zone A/B). 100% throughput."

        if iso_zone == "ZONE_D" or (is_resonant and v_rms > self.max_vrms):
            self.emergency_trip_active = True
            self.actuator_throttle_pct = max(0.0, self.actuator_throttle_pct - 45.0)
            suggested_action = "EMERGENCY_SHUTDOWN_TRIP"
            decision_note = f"CRITICAL: ISO Zone D exceeded ({v_rms:.2f} mm/s). Emergency trip relay active. Clamping VFD to safe floor."
        elif iso_zone == "ZONE_C" or is_resonant:
            self.emergency_trip_active = False
            self.actuator_throttle_pct = np.clip(self.actuator_throttle_pct - pid_adjustment, 35.0, 85.0)
            suggested_action = "DAMPEN_ACTIVE"
            decision_note = f"WARNING: Vibration ({v_rms:.2f} mm/s) in ISO Zone C. Regulating VFD throttle to mitigate excitation."
        elif iso_zone == "ZONE_B":
            self.emergency_trip_active = False
            self.actuator_throttle_pct = np.clip(self.actuator_throttle_pct + 0.5, 60.0, 95.0)
            suggested_action = "REGULATE"
            decision_note = "Vibration acceptable for continuous operation. Regulating load."
        else:
            self.emergency_trip_active = False
            self.actuator_throttle_pct = min(100.0, self.actuator_throttle_pct + 2.0)
            suggested_action = "NORMAL_RAMP"

        self.actuator_throttle_pct = round(float(self.actuator_throttle_pct), 1)

        plc_command = {
            "timestamp": datetime.now().isoformat(),
            "plc_register_40001_throttle": self.actuator_throttle_pct,
            "plc_coil_00001_trip_relay": self.emergency_trip_active,
            "suggested_action": suggested_action,
            "decision_rationale": decision_note,
            "iso_zone": iso_zone,
            "resonance_detected": bool(is_resonant)
        }

        self.action_history.append(plc_command)
        if len(self.action_history) > self.max_history:
            self.action_history.pop(0)

        return plc_command

    def get_system_telemetry_mcp(self) -> Dict[str, Any]:
        """Tool for MCP agent to query current health status and PLC parameters."""
        return {
            "current_throttle_pct": self.actuator_throttle_pct,
            "emergency_trip_active": self.emergency_trip_active,
            "resonance_band_hz": self.resonance_band,
            "max_allowable_vrms_mms": self.max_vrms,
            "recent_actions": self.action_history[-5:]
        }
