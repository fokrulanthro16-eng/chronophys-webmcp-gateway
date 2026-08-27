"""
ChronoPhys-Vision 3.0: Physics-Informed Fatigue & Remaining Useful Life (RUL) Prediction
Implements:
- Wöhler S-N Basquin Stress-Life Formulation for Rotating Machinery Alloys
- Palmgren-Miner Linear Damage Accumulation: D = sum(n_i / N_i)
- Real-Time Remaining Useful Life (RUL in Hours) & Fatigue Hazard Index (0.0 to 1.0)
"""

from typing import Dict, Any, Optional
import numpy as np


class MaterialProperties:
    """Mechanical properties for industrial machinery alloys (default: AISI 4140 Alloy Steel)."""
    def __init__(
        self,
        name: str = "AISI 4140 Steel",
        youngs_modulus_gpa: float = 210.0,
        ultimate_tensile_mpa: float = 850.0,
        endurance_limit_mpa: float = 380.0,
        basquin_exponent_m: float = 4.5,
        stress_concentration_kf: float = 1.6
    ):
        self.name = name
        self.E_gpa = youngs_modulus_gpa
        self.S_ut = ultimate_tensile_mpa
        self.S_e = endurance_limit_mpa
        self.m = basquin_exponent_m
        self.kf = stress_concentration_kf


class PINNFatigueEngine:
    """
    Physics-Informed Neural / Mechanistic Fatigue Accumulator and RUL Predictor.
    """

    def __init__(
        self,
        material: Optional[MaterialProperties] = None,
        shaft_diameter_mm: float = 50.0,
        shaft_length_mm: float = 600.0
    ):
        self.mat = material or MaterialProperties()
        self.d_mm = float(shaft_diameter_mm)
        self.L_mm = float(shaft_length_mm)

        # Cumulative damage counter D in [0.0, 1.0] (1.0 = mechanical fatigue failure)
        self.cumulative_damage: float = 0.0001
        self.damage_rate_per_sec: float = 0.0
        self.total_operating_seconds: float = 0.0

        # Stress history
        self.last_stress_mpa: float = 0.0
        self.peak_stress_mpa: float = 0.0

    def evaluate_cycle_damage(
        self,
        displacement_peak_mm: float,
        dominant_freq_hz: float,
        dt_seconds: float
    ) -> Dict[str, Any]:
        """
        Translates physical displacement into cyclic bending stress and Palmgren-Miner damage.
        """
        self.total_operating_seconds += dt_seconds
        
        # 1. Mechanics of Materials: Cyclic Bending Stress Calculation (MPa)
        # sigma = Kf * (3 * E * d * X) / (L^2) for simply-supported rotor beam
        E_mpa = self.mat.E_gpa * 1000.0
        disp_mm = max(1e-5, displacement_peak_mm)
        
        geometric_factor = (3.0 * E_mpa * self.d_mm) / (self.L_mm ** 2)
        nominal_stress_mpa = geometric_factor * disp_mm
        effective_stress_a = float(self.mat.kf * nominal_stress_mpa)

        self.last_stress_mpa = effective_stress_a
        self.peak_stress_mpa = max(self.peak_stress_mpa, effective_stress_a)

        # 2. Wöhler S-N Curve (Basquin Formulation)
        # N_f = 10^6 * (S_e / sigma_a)^m
        if effective_stress_a > self.mat.S_e:
            ratio = self.mat.S_e / effective_stress_a
            cycles_to_failure = float(1e6 * (ratio ** self.mat.m))
            cycles_to_failure = max(100.0, cycles_to_failure)
        else:
            # Below endurance limit -> quasi-infinite life
            cycles_to_failure = 1e12

        # 3. Palmgren-Miner Linear Damage Accumulation: dD = n / N_f
        actual_cycles = dominant_freq_hz * dt_seconds if dominant_freq_hz > 0 else 1.0 * dt_seconds
        delta_damage = actual_cycles / cycles_to_failure

        self.cumulative_damage = min(1.0, self.cumulative_damage + delta_damage)
        self.damage_rate_per_sec = delta_damage / max(0.001, dt_seconds)

        # 4. Remaining Useful Life (RUL in Hours)
        if self.damage_rate_per_sec > 1e-12:
            rul_seconds = (1.0 - self.cumulative_damage) / self.damage_rate_per_sec
            rul_hours = float(rul_seconds / 3600.0)
        else:
            rul_hours = 99999.0

        # 5. Fatigue Hazard Level
        if self.cumulative_damage > 0.85 or effective_stress_a > (self.mat.S_ut * 0.7):
            hazard_state = "CRITICAL_FAILURE_IMMINENT"
            hazard_index = 0.95
        elif self.cumulative_damage > 0.50 or effective_stress_a > self.mat.S_e:
            hazard_state = "HIGH_FATIGUE_ACCUMULATION"
            hazard_index = 0.65
        elif self.cumulative_damage > 0.20:
            hazard_state = "MODERATE_WEAR"
            hazard_index = 0.35
        else:
            hazard_state = "NOMINAL_ENDURANCE"
            hazard_index = 0.05

        return {
            "cyclic_stress_amplitude_mpa": round(effective_stress_a, 2),
            "endurance_limit_mpa": self.mat.S_e,
            "cumulative_damage_fraction": round(self.cumulative_damage, 6),
            "damage_percentage": round(self.cumulative_damage * 100.0, 3),
            "remaining_useful_life_hours": round(min(rul_hours, 99999.0), 1),
            "fatigue_hazard_index": round(hazard_index, 2),
            "fatigue_state": hazard_state,
            "material_name": self.mat.name,
            "cycles_to_failure_estimate": int(min(cycles_to_failure, 1e12))
        }
