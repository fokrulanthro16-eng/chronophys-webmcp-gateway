"""
ChronoPhys-Vision 3.0: Enterprise Financial ROI & Downtime Cost Calculator
Calculates:
- Estimated Downtime Cost Saved ($)
- Avoided Unplanned Outage Production Hours
- Asset Health Index (AHI %: 0 - 100%)
- Predictive Maintenance ROI Ratio
"""

from typing import Dict, Any


class EnterpriseROICalculator:
    """
    Computes real-time financial ROI and operational risk mitigation metrics.
    """

    def __init__(self, hourly_downtime_rate: float = 3500.0, base_catastrophic_cost: float = 45000.0):
        self.hourly_downtime_rate = hourly_downtime_rate
        self.base_catastrophic_cost = base_catastrophic_cost

    def compute_roi(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates dynamic financial ROI and Asset Health Index."""
        fft = telemetry.get("fft", {})
        iso = telemetry.get("iso", {})
        pinn = telemetry.get("pinn_fatigue", {})
        trip = telemetry.get("hardware_trip", {})

        v_rms = fft.get("vibration_velocity_rms_mms", 0.0)
        zone = iso.get("iso_zone", "ZONE_A")
        is_tripped = trip.get("is_tripped", False) or (v_rms >= 4.5)
        damage_pct = pinn.get("damage_percentage", 0.0)

        # Asset Health Index (AHI %): 0 - 100%
        # Based on ISO zone, vibration velocity, and cumulative damage
        if zone == "ZONE_A":
            ahi = max(90.0, 100.0 - (v_rms / 1.4) * 10.0 - damage_pct * 0.1)
            avoided_hours = 18.5
            catastrophic_avoided = True
        elif zone == "ZONE_B":
            ahi = max(70.0, 90.0 - ((v_rms - 1.4) / 1.4) * 20.0 - damage_pct * 0.2)
            avoided_hours = 15.0
            catastrophic_avoided = True
        elif zone == "ZONE_C":
            ahi = max(40.0, 70.0 - ((v_rms - 2.8) / 1.7) * 30.0 - damage_pct * 0.5)
            avoided_hours = 12.0
            catastrophic_avoided = True
        else: # ZONE_D
            ahi = max(10.0, 40.0 - ((v_rms - 4.5) / 5.0) * 30.0)
            avoided_hours = 8.5
            catastrophic_avoided = is_tripped  # Early automatic tripping saves the machine

        # Financial savings calculation
        downtime_saved = avoided_hours * self.hourly_downtime_rate
        capital_equipment_saved = self.base_catastrophic_cost if catastrophic_avoided else 0.0
        total_dollars_saved = downtime_saved + capital_equipment_saved

        return {
            "asset_health_index_pct": round(ahi, 1),
            "estimated_dollars_saved": round(total_dollars_saved, 0),
            "avoided_outage_hours": round(avoided_hours, 1),
            "hourly_downtime_rate": self.hourly_downtime_rate,
            "capital_equipment_saved": capital_equipment_saved,
            "roi_multiple": f"{round(total_dollars_saved / 1200.0, 1)}x",
            "is_emergency_tripped": is_tripped
        }
