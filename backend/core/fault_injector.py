"""
ChronoPhys-Vision 3.0: Interactive Industrial Fault Injection & Simulation Engine
Presets:
- 🟢 Baseline / Normal Commissioning (Zone A)
- 🟠 1X Dynamic Rotor Unbalance (Zone B/C)
- 🔴 2X Angular Misalignment (Zone D - Emergency Trip)
- ⚠️ 3X-5X Mechanical Foundation Looseness
- ⚡ High-Frequency Bearing Fault (BPFI/BPFO)
"""

from typing import Dict, Any, Tuple
from enum import Enum
import numpy as np


class FaultPreset(str, Enum):
    BASELINE_NORMAL = "BASELINE_NORMAL"
    ROTOR_UNBALANCE_1X = "ROTOR_UNBALANCE_1X"
    ANGULAR_MISALIGNMENT_2X = "ANGULAR_MISALIGNMENT_2X"
    FOUNDATION_LOOSENESS_3X_5X = "FOUNDATION_LOOSENESS_3X_5X"
    BEARING_DEFECT_BPFI_BPFO = "BEARING_DEFECT_BPFI_BPFO"


class FaultInjectionEngine:
    """
    Simulates real-time mechanical vibration faults for live interactive demonstrations.
    Modulates displacement amplitudes, harmonic frequencies, and cross-spectral phase angles.
    """

    def __init__(self):
        self.active_preset = FaultPreset.BASELINE_NORMAL

    def set_preset(self, preset_name: str) -> Dict[str, Any]:
        """Sets the active fault simulation preset."""
        try:
            self.active_preset = FaultPreset(preset_name.upper())
        except ValueError:
            self.active_preset = FaultPreset.BASELINE_NORMAL

        return {
            "status": "PRESET_UPDATED",
            "active_preset": self.active_preset.value,
            "description": self.get_preset_description(self.active_preset)
        }

    def get_preset_description(self, preset: FaultPreset) -> str:
        descriptions = {
            FaultPreset.BASELINE_NORMAL: "Baseline commissioning: nominal rotating vibration within ISO Zone A (< 1.4 mm/s).",
            FaultPreset.ROTOR_UNBALANCE_1X: "1X Dynamic Rotor Unbalance: dominant 1X fundamental peak with in-phase DE/NDE motion.",
            FaultPreset.ANGULAR_MISALIGNMENT_2X: "2X Angular Misalignment: severe 2X harmonic and 180° out-of-phase rocking (ISO Zone D Trip).",
            FaultPreset.FOUNDATION_LOOSENESS_3X_5X: "3X-5X Foundation Looseness: truncated non-linear harmonics and structural play.",
            FaultPreset.BEARING_DEFECT_BPFI_BPFO: "High-Frequency Bearing Fault: inner/outer race impulse impacts (BPFI / BPFO bursts)."
        }
        return descriptions.get(preset, "Standard Operation")

    def configure_synthetic_generator(self, generator: Any, nominal_rpm: float = 1800.0) -> None:
        """Modulates synthetic vibration generator parameters based on active fault."""
        f1x = max(0.5, nominal_rpm / 60.0)
        # For demonstration visualization, scale base frequency into optimal EVM band (2.0 to 6.0 Hz)
        demo_f1x = 3.5

        if self.active_preset == FaultPreset.BASELINE_NORMAL:
            generator.freq = demo_f1x
            generator.amp = 0.25  # Sub-pixel small amplitude
        elif self.active_preset == FaultPreset.ROTOR_UNBALANCE_1X:
            generator.freq = demo_f1x
            generator.amp = 0.85
        elif self.active_preset == FaultPreset.ANGULAR_MISALIGNMENT_2X:
            generator.freq = demo_f1x * 2.0  # 2X harmonic
            generator.amp = 1.65  # Large amplitude -> Zone D
        elif self.active_preset == FaultPreset.FOUNDATION_LOOSENESS_3X_5X:
            generator.freq = demo_f1x * 3.0  # 3X harmonic
            generator.amp = 1.20
        elif self.active_preset == FaultPreset.BEARING_DEFECT_BPFI_BPFO:
            generator.freq = demo_f1x * 5.2  # High frequency BPFO
            generator.amp = 0.95

    def modulate_telemetry(self, telemetry: Dict[str, Any], nominal_rpm: float = 1800.0) -> Dict[str, Any]:
        """Injects synchronized phase shifts and harmonic data matching the active fault."""
        if self.active_preset == FaultPreset.BASELINE_NORMAL:
            return telemetry

        fft = telemetry.get("fft", {})
        multi = telemetry.get("multi_roi", {})
        phase_analysis = multi.setdefault("phase_analysis", {})

        demo_f1x = 3.5

        if self.active_preset == FaultPreset.ROTOR_UNBALANCE_1X:
            phase_analysis["de_vs_nde"] = {
                "phase_deg": 8.5,
                "relationship": "IN_PHASE_0_DEG",
                "description": "In-Phase: Dynamic Rotor Unbalance (1X RPM dominant)",
                "coherence": 0.98,
                "freq_hz": demo_f1x
            }

        elif self.active_preset == FaultPreset.ANGULAR_MISALIGNMENT_2X:
            phase_analysis["de_vs_nde"] = {
                "phase_deg": 178.2,
                "relationship": "OUT_OF_PHASE_180_DEG",
                "description": "Out-of-Phase (180°): Severe Angular Misalignment across coupling (ISO Zone D)",
                "coherence": 0.99,
                "freq_hz": demo_f1x * 2.0
            }
            # Scale v_rms into Zone D
            fft["vibration_velocity_rms_mms"] = max(5.62, fft.get("vibration_velocity_rms_mms", 0.0) * 2.5)

        elif self.active_preset == FaultPreset.FOUNDATION_LOOSENESS_3X_5X:
            phase_analysis["de_vs_nde"] = {
                "phase_deg": 92.4,
                "relationship": "QUADRATURE_90_DEG",
                "description": "Quadrature: Foundation Looseness / Soft Foot structural play",
                "coherence": 0.92,
                "freq_hz": demo_f1x * 3.0
            }
            fft["vibration_velocity_rms_mms"] = max(4.15, fft.get("vibration_velocity_rms_mms", 0.0) * 1.8)

        elif self.active_preset == FaultPreset.BEARING_DEFECT_BPFI_BPFO:
            phase_analysis["de_vs_nde"] = {
                "phase_deg": 45.0,
                "relationship": "NON_HARMONIC",
                "description": "High-Frequency Burst: Rolling Element Defect (BPFO/BPFI)",
                "coherence": 0.88,
                "freq_hz": demo_f1x * 5.2
            }
            fft["vibration_velocity_rms_mms"] = max(3.35, fft.get("vibration_velocity_rms_mms", 0.0) * 1.5)

        return telemetry
