"""
ChronoPhys-Vision 3.0: 3D Operational Deflection Shape (3D ODS) Digital Twin Engine
Features:
- Live 3D Deformed Mesh Generation for Rotating Machinery Assets
- Multi-Point Modal Deflection Vectors (DE Bearing, Coupling, Rotor Shaft, NDE Bearing, Baseplate)
- JSON Payload formatting for Three.js WebGL rendering
"""

from typing import Dict, Any, List, Optional
import numpy as np


class ODSDigitalTwinEngine:
    """
    Computes real-time 3D Operational Deflection Shapes from multi-point optical displacements.
    """

    def __init__(self, fps: float = 30.0):
        self.fps = fps
        self.t_step = 0

        # Nominal undeformed 3D machine geometry nodes: [x, y, z]
        self.base_nodes = {
            "DE_BEARING": np.array([-2.5, 0.8, 0.0], dtype=np.float32),
            "COUPLING": np.array([-1.2, 0.8, 0.0], dtype=np.float32),
            "ROTOR_SHAFT_MID": np.array([0.5, 0.8, 0.0], dtype=np.float32),
            "NDE_BEARING": np.array([2.5, 0.8, 0.0], dtype=np.float32),
            "BASE_FRONT_LEFT": np.array([-3.0, -0.8, 1.2], dtype=np.float32),
            "BASE_FRONT_RIGHT": np.array([3.0, -0.8, 1.2], dtype=np.float32),
            "BASE_BACK_LEFT": np.array([-3.0, -0.8, -1.2], dtype=np.float32),
            "BASE_BACK_RIGHT": np.array([3.0, -0.8, -1.2], dtype=np.float32),
        }

    def compute_3d_deflection(
        self,
        multi_roi_data: Dict[str, Any],
        dominant_freq_hz: float,
        exaggeration_factor: float = 45.0
    ) -> Dict[str, Any]:
        """
        Computes dynamic 3D deflected positions for each mesh node.
        """
        t = self.t_step / self.fps
        self.t_step += 1

        phase_info = multi_roi_data.get("phase_analysis", {}).get("de_vs_nde", {})
        phase_rad = np.radians(phase_info.get("phase_deg", 0.0))

        rois = multi_roi_data.get("rois", {})
        de_disp = rois.get("DE_BEARING", {}).get("disp_mag_um", 10.0) / 1000.0 # mm
        nde_disp = rois.get("NDE_BEARING", {}).get("disp_mag_um", 10.0) / 1000.0 # mm
        base_disp = rois.get("BASE_FOUNDATION", {}).get("disp_mag_um", 2.0) / 1000.0 # mm

        omega = 2.0 * np.pi * (dominant_freq_hz if dominant_freq_hz > 0 else 3.5)

        # Dynamic Deflection Equations:
        # DE Bearing: y(t) = A_de * sin(omega * t)
        # NDE Bearing: y(t) = A_nde * sin(omega * t + phase_rad)
        dy_de = (de_disp * exaggeration_factor) * np.sin(omega * t)
        dy_nde = (nde_disp * exaggeration_factor) * np.sin(omega * t + phase_rad)
        
        # Shaft Midpoint (Bending mode shape interpolation)
        dy_mid = 0.5 * (dy_de + dy_nde) + (0.35 * exaggeration_factor * (de_disp + nde_disp) * 0.5 * np.sin(omega * t))

        # Coupling (Torsional / Angular twist)
        dy_coupling = 0.8 * dy_de + 0.2 * dy_nde
        dx_coupling = (0.2 * exaggeration_factor * de_disp) * np.cos(omega * t)

        # Baseplate
        dy_base = (base_disp * exaggeration_factor) * np.sin(omega * t * 0.5)

        # Build deflected 3D coordinate dictionary
        deflected_nodes = {
            "DE_BEARING": [round(float(self.base_nodes["DE_BEARING"][0]), 3), round(float(self.base_nodes["DE_BEARING"][1] + dy_de), 3), round(float(self.base_nodes["DE_BEARING"][2]), 3)],
            "COUPLING": [round(float(self.base_nodes["COUPLING"][0] + dx_coupling), 3), round(float(self.base_nodes["COUPLING"][1] + dy_coupling), 3), round(float(self.base_nodes["COUPLING"][2]), 3)],
            "ROTOR_SHAFT_MID": [round(float(self.base_nodes["ROTOR_SHAFT_MID"][0]), 3), round(float(self.base_nodes["ROTOR_SHAFT_MID"][1] + dy_mid), 3), round(float(self.base_nodes["ROTOR_SHAFT_MID"][2]), 3)],
            "NDE_BEARING": [round(float(self.base_nodes["NDE_BEARING"][0]), 3), round(float(self.base_nodes["NDE_BEARING"][1] + dy_nde), 3), round(float(self.base_nodes["NDE_BEARING"][2]), 3)],
            "BASE_FRONT_LEFT": [round(float(self.base_nodes["BASE_FRONT_LEFT"][0]), 3), round(float(self.base_nodes["BASE_FRONT_LEFT"][1] + dy_base), 3), round(float(self.base_nodes["BASE_FRONT_LEFT"][2]), 3)],
            "BASE_FRONT_RIGHT": [round(float(self.base_nodes["BASE_FRONT_RIGHT"][0]), 3), round(float(self.base_nodes["BASE_FRONT_RIGHT"][1] + dy_base), 3), round(float(self.base_nodes["BASE_FRONT_RIGHT"][2]), 3)],
            "BASE_BACK_LEFT": [round(float(self.base_nodes["BASE_BACK_LEFT"][0]), 3), round(float(self.base_nodes["BASE_BACK_LEFT"][1] - dy_base * 0.5), 3), round(float(self.base_nodes["BASE_BACK_LEFT"][2]), 3)],
            "BASE_BACK_RIGHT": [round(float(self.base_nodes["BASE_BACK_RIGHT"][0]), 3), round(float(self.base_nodes["BASE_BACK_RIGHT"][1] - dy_base * 0.5), 3), round(float(self.base_nodes["BASE_BACK_RIGHT"][2]), 3)],
        }

        # Structural Connectivity Lines (Wireframe Edges)
        edges = [
            ["DE_BEARING", "COUPLING"],
            ["COUPLING", "ROTOR_SHAFT_MID"],
            ["ROTOR_SHAFT_MID", "NDE_BEARING"],
            ["DE_BEARING", "BASE_FRONT_LEFT"],
            ["DE_BEARING", "BASE_BACK_LEFT"],
            ["NDE_BEARING", "BASE_FRONT_RIGHT"],
            ["NDE_BEARING", "BASE_BACK_RIGHT"],
            ["BASE_FRONT_LEFT", "BASE_FRONT_RIGHT"],
            ["BASE_FRONT_RIGHT", "BASE_BACK_RIGHT"],
            ["BASE_BACK_RIGHT", "BASE_BACK_LEFT"],
            ["BASE_BACK_LEFT", "BASE_FRONT_LEFT"]
        ]

        return {
            "mode_shape_type": "1ST_BENDING_TORSION" if abs(phase_info.get("phase_deg", 0)) > 60 else "TRANSLATIONAL_BOUNCE",
            "exaggeration_factor": exaggeration_factor,
            "nodes": deflected_nodes,
            "edges": edges,
            "max_modal_deflection_mm": round(float(max(de_disp, nde_disp)), 4)
        }
