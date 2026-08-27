"""
ChronoPhys-Vision 3.0: Google Gemini 2.5 Flash Maintenance AI Assistant
Features:
- Loads GEMINI_API_KEY from .env file via python-dotenv or per-request UI override
- Powered by gemini-2.5-flash model with Senior Reliability & Vibration Specialist System Prompt
- Real-time Multi-ROI, ISO 10816-3, and PINN Fatigue telemetry grounding
- Robust error handling for invalid/expired API keys
"""

import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

SYSTEM_INSTRUCTION = """You are the Senior Principal Reliability & Vibration Diagnostics AI Engineer for ChronoPhys-Vision 3.0.
You specialize in:
1. Contactless Eulerian Video Motion Magnification (EVM) and Sub-pixel Modal Spectrum Analysis.
2. ISO 10816-3 mechanical vibration severity classification (Zones A, B, C, D) for rotating machinery.
3. Multi-ROI cross-spectral phase analysis (Delta Theta): distinguishing unbalance (0 deg), shaft misalignment (180 deg), and structural looseness.
4. Physics-Informed Fatigue & Remaining Useful Life (PINN Wöhler S-N curves & Palmgren-Miner linear cumulative damage).
5. Corrective maintenance actions, laser shaft alignment tolerances, dynamic balancing, and emergency fail-safe tripping.

Provide clear, professional, structured engineering responses with markdown headings, bullet points, and specific numerical references to the live telemetry provided in the context."""


class MaintenanceAIAssistant:
    """
    Context-enriched Predictive Maintenance Assistant powered by Gemini 2.5 Flash.
    """

    def __init__(self):
        self.default_api_key = os.environ.get("GEMINI_API_KEY", "")

    def _build_context_prompt(self, query: str, telemetry: Dict[str, Any]) -> str:
        """Constructs an engineering prompt embedding live machine telemetry."""
        fft = telemetry.get("fft", {})
        iso = telemetry.get("iso", {})
        multi = telemetry.get("multi_roi", {})
        pinn = telemetry.get("pinn_fatigue", {})
        plc = telemetry.get("plc", {})
        mb = telemetry.get("modbus", {}).get("registers", {})

        phase_info = multi.get("phase_analysis", {}).get("de_vs_nde", {})

        v_rms = fft.get("vibration_velocity_rms_mms", 0.0)
        dom_freq = fft.get("dominant_frequency_hz", 0.0)
        snr = fft.get("peak_snr_db", 0.0)
        disp_um = fft.get("subpixel_displacement_um", {}).get("magnitude_um", 0.0)

        zone = iso.get("iso_zone", "ZONE_A")
        assessment = iso.get("assessment", "Normal")

        phase_deg = phase_info.get("phase_deg", 0.0)
        phase_rel = phase_info.get("relationship", "IN_PHASE_0_DEG")
        phase_desc = phase_info.get("description", "In-Phase: Rigid body bounce / Unbalance dominant")

        stress_mpa = pinn.get("cyclic_stress_amplitude_mpa", 0.0)
        damage_pct = pinn.get("damage_percentage", 0.0)
        rul_hrs = pinn.get("remaining_useful_life_hours", 99999.0)
        fatigue_state = pinn.get("fatigue_state", "NOMINAL_ENDURANCE")

        throttle = plc.get("plc_register_40001_throttle", 100.0)
        rpm = mb.get("HR40001_RPM", 1800)

        prompt = f"""### LIVE MACHINERY TELEMETRY (ChronoPhys-Vision 3.0 Real-time Sensor Data):
- **Operating Speed**: {rpm} RPM ({rpm/60.0:.2f} Hz fundamental 1X)
- **Vibration Velocity RMS (v_RMS)**: {v_rms:.3f} mm/s
- **ISO 10816-3 Severity Classification**: {zone} ({assessment})
- **Dominant Modal Frequency**: {dom_freq:.2f} Hz (Peak SNR: {snr:.1f} dB)
- **Peak Micro-Displacement**: {disp_um:.1f} µm ({disp_um/1000.0:.4f} mm)
- **DE vs NDE Bearing Cross Phase (Δθ)**: {phase_deg:+.1f}° ({phase_rel} - {phase_desc})
- **Cyclic Bending Stress Amplitude (σ_a)**: {stress_mpa:.1f} MPa (Material: AISI 4140 Steel, Endurance Limit: 380 MPa)
- **Cumulative Palmgren-Miner Damage**: {damage_pct:.3f}%
- **Predicted Remaining Useful Life (RUL)**: {rul_hrs:,.1f} Hours (Fatigue State: {fatigue_state})
- **Modbus TCP Closed-Loop VFD Throttle**: {throttle:.1f}%

### USER INQUIRY:
{query}

Please analyze this machinery health data and provide diagnostic insight, root-cause assessment, and actionable maintenance recommendations."""
        return prompt

    def generate_response(
        self,
        query: str,
        telemetry: Dict[str, Any],
        api_key: Optional[str] = None
    ) -> str:
        """
        Generates diagnostic guidance using Gemini 2.5 Flash.
        """
        load_dotenv()
        active_key = (api_key or "").strip() or os.environ.get("GEMINI_API_KEY", "")

        if not active_key:
            return (
                "⚠️ **Gemini API Key Required**\n\n"
                "Please enter and save your **Google Gemini API Key** in the input field at the top of this drawer to activate real-time AI vibration engineering analysis."
            )

        try:
            genai.configure(api_key=active_key)
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=SYSTEM_INSTRUCTION
            )

            prompt = self._build_context_prompt(query, telemetry)
            response = model.generate_content(prompt)

            if response and response.text:
                return response.text
            return "No response generated from Gemini."

        except Exception as e:
            err_msg = str(e)
            if "API_KEY_INVALID" in err_msg or "400" in err_msg or "API key not valid" in err_msg:
                return (
                    "❌ **Invalid Google Gemini API Key**\n\n"
                    "The provided API key was rejected by the Google Generative AI API. Please verify your API key at [Google AI Studio](https://aistudio.google.com/app/apikey) and re-enter it."
                )
            elif "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg:
                return (
                    "⚠️ **Rate Limit / Quota Exceeded**\n\n"
                    "The Gemini API rate limit or free quota has been temporarily reached. Please wait a few seconds and try again."
                )
            else:
                return f"⚠️ **Gemini API Error**: {err_msg}"
