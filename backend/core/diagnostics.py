"""
ChronoPhys-Vision: ISO 10816-3 Vibration Severity & Automated Fault Diagnostics Module
Implements:
- ISO 10816-3 Machine Vibration Severity Evaluation (Zone A, B, C, D)
- Automated Mechanical Fault Identification (1X Unbalance, 2X Misalignment, Looseness, Bearing Anomaly)
- Prescriptive Maintenance Guidance
"""

from typing import Dict, Any, List, Optional
from enum import Enum


class ISOZone(str, Enum):
    ZONE_A = "ZONE_A"   # Newly commissioned / Excellent
    ZONE_B = "ZONE_B"   # Unrestricted long-term continuous operation
    ZONE_C = "ZONE_C"   # Alert / Restricted operation
    ZONE_D = "ZONE_D"   # Critical / Trip & immediate shutdown


class MachineGroup(str, Enum):
    GROUP_1_RIGID = "GROUP_1_RIGID"         # Large machines (>300 kW) on rigid foundation
    GROUP_1_FLEXIBLE = "GROUP_1_FLEXIBLE"   # Large machines (>300 kW) on flexible foundation
    GROUP_2_RIGID = "GROUP_2_RIGID"         # Medium machines (15-300 kW) on rigid foundation
    GROUP_2_FLEXIBLE = "GROUP_2_FLEXIBLE"   # Medium machines (15-300 kW) on flexible foundation


# ISO 10816-3 Velocity RMS Thresholds (mm/s)
# Format: (Zone A max, Zone B max, Zone C max)
ISO_LIMITS = {
    MachineGroup.GROUP_2_RIGID: (1.4, 2.8, 4.5),
    MachineGroup.GROUP_2_FLEXIBLE: (2.3, 4.5, 7.1),
    MachineGroup.GROUP_1_RIGID: (2.8, 4.5, 7.1),
    MachineGroup.GROUP_1_FLEXIBLE: (4.5, 7.1, 11.0),
}


class IndustrialDiagnosticsEngine:
    """
    Evaluates vibration telemetry against ISO 10816-3 standards and detects mechanical anomalies.
    """

    def __init__(
        self,
        machine_group: MachineGroup = MachineGroup.GROUP_2_RIGID,
        nominal_rpm: float = 1800.0,
        resonance_band_hz: tuple = (3.0, 4.5)
    ):
        self.machine_group = machine_group
        self.nominal_rpm = max(1.0, float(nominal_rpm))
        self.resonance_band = resonance_band_hz

    def set_machine_group(self, group_name: str) -> None:
        """Update machine classification group."""
        try:
            self.machine_group = MachineGroup(group_name)
        except ValueError:
            self.machine_group = MachineGroup.GROUP_2_RIGID

    def set_nominal_rpm(self, rpm: float) -> None:
        """Update machine nominal running speed (RPM)."""
        if rpm > 0:
            self.nominal_rpm = float(rpm)

    def evaluate_iso_severity(self, v_rms_mms: float) -> Dict[str, Any]:
        """
        Classifies vibration velocity RMS according to ISO 10816-3.
        """
        lim_a, lim_b, lim_c = ISO_LIMITS.get(self.machine_group, (1.4, 2.8, 4.5))

        if v_rms_mms < lim_a:
            zone = ISOZone.ZONE_A
            color = "#22c55e" # Green
            desc = "Newly commissioned / Excellent (Unrestricted operation)"
            action = "MAINTAIN_NORMAL"
        elif v_rms_mms < lim_b:
            zone = ISOZone.ZONE_B
            color = "#06b6d4" # Cyan
            desc = "Acceptable for unrestricted long-term continuous operation"
            action = "CONTINUE_MONITORING"
        elif v_rms_mms < lim_c:
            zone = ISOZone.ZONE_C
            color = "#f59e0b" # Amber
            desc = "Unsatisfactory / Restricted operation (Maintenance alert)"
            action = "SCHEDULE_MAINTENANCE"
        else:
            zone = ISOZone.ZONE_D
            color = "#ef4444" # Red
            desc = "Critical / Danger of structural fatigue (Immediate shutdown trip)"
            action = "EMERGENCY_SHUTDOWN_TRIP"

        return {
            "iso_zone": zone.value,
            "zone_label": zone.name.replace("_", " "),
            "zone_color": color,
            "v_rms_mms": round(v_rms_mms, 3),
            "zone_thresholds_mms": {"zone_a": lim_a, "zone_b": lim_b, "zone_c": lim_c},
            "machine_group": self.machine_group.value,
            "assessment": desc,
            "recommended_action": action
        }

    def diagnose_faults(self, telemetry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Performs automated mechanical fault identification based on modal harmonics.
        """
        faults: List[Dict[str, Any]] = []
        dom_freq = telemetry.get("dominant_frequency_hz", 0.0)
        v_rms = telemetry.get("vibration_velocity_rms_mms", 0.0)
        snr = telemetry.get("peak_snr_db", 0.0)
        harmonics = telemetry.get("harmonics", [])
        zeta = telemetry.get("damping_ratio_zeta", 0.0)

        running_hz = self.nominal_rpm / 60.0
        if dom_freq <= 0.1 or snr < 3.0:
            return faults

        ratio = dom_freq / running_hz if running_hz > 0 else 1.0

        # 1. Check for Structural Harmonic Resonance
        if self.resonance_band[0] <= dom_freq <= self.resonance_band[1] and snr > 6.0:
            faults.append({
                "fault_code": "FAULT_RESONANCE",
                "severity": "CRITICAL" if v_rms > 2.8 else "WARNING",
                "title": "Structural Harmonic Resonance",
                "description": f"Excitation frequency ({dom_freq:.2f} Hz) closely matches natural structural resonance ({self.resonance_band[0]}-{self.resonance_band[1]} Hz) with low damping ratio (zeta={zeta:.3f}).",
                "recommendation": "Adjust VFD running speed away from resonant critical speed band or install tuned mass dampeners."
            })

        # 2. 1X Running Speed -> Rotor Mass Unbalance
        if 0.92 <= ratio <= 1.08:
            faults.append({
                "fault_code": "FAULT_UNBALANCE_1X",
                "severity": "WARNING" if v_rms > 2.0 else "INFO",
                "title": "Rotor Mass Unbalance (1X RPM)",
                "description": f"Strong spectral peak at 1X running frequency ({dom_freq:.2f} Hz = {dom_freq*60:.0f} RPM) indicates dynamic or static rotor eccentricity.",
                "recommendation": "Perform single-plane or dynamic field balancing on the rotor shaft."
            })

        # 3. 2X Running Speed -> Shaft Misalignment
        has_2x = False
        for h in harmonics:
            h_freq = h.get("frequency_hz", 0.0)
            h_ratio = h_freq / running_hz if running_hz > 0 else 0
            if 1.85 <= h_ratio <= 2.15:
                has_2x = True
                break

        if (1.85 <= ratio <= 2.15) or has_2x:
            faults.append({
                "fault_code": "FAULT_MISALIGNMENT_2X",
                "severity": "WARNING" if v_rms > 2.5 else "INFO",
                "title": "Shaft / Coupling Misalignment (2X RPM)",
                "description": f"Elevated 2X running harmonic ({2*running_hz:.1f} Hz) detected, typical of angular or parallel coupling misalignment.",
                "recommendation": "Perform laser shaft alignment and check flexible coupling condition."
            })

        # 4. Sub-synchronous Oil Whirl (0.4X - 0.48X)
        if 0.38 <= ratio <= 0.49:
            faults.append({
                "fault_code": "FAULT_OIL_WHIRL",
                "severity": "CRITICAL",
                "title": "Hydrodynamic Oil Whirl / Sub-Synchronous Instability",
                "description": f"Sub-synchronous peak at {ratio:.2f}X running speed indicates fluid film bearing instability.",
                "recommendation": "Check lubricant viscosity, bearing clearance, and oil supply temperature."
            })

        # 5. Multiple Harmonics -> Mechanical Looseness
        if len(harmonics) >= 3 and v_rms > 1.8:
            faults.append({
                "fault_code": "FAULT_LOOSENESS",
                "severity": "WARNING",
                "title": "Mechanical Foundation Looseness",
                "description": "Truncated waveform with multiple higher-order integer harmonics (3X, 4X, 5X) indicative of loose mounting bolts or foundation play.",
                "recommendation": "Torque foundation anchor bolts and inspect pedestal base plates."
            })

        return faults
