"""
ChronoPhys-Vision 3.0: ArUco Marker Auto-Calibration & Perspective Homography
Features:
- ArUco DICT_4X4_50 detection for physical mm/pixel auto-scaling
- Homography perspective rectification for off-axis camera angles
- Known physical marker dimension: 50.0 mm default
"""

from typing import Tuple, Dict, Any, Optional, List
import cv2
import numpy as np


class ArUcoAutoCalibrator:
    """
    Detects ArUco calibration targets to dynamically calibrate spatial scale (mm/px)
    and compute homography transformation matrices for perspective correction.
    """

    def __init__(self, physical_marker_size_mm: float = 50.0, dictionary_id: int = cv2.aruco.DICT_4X4_50):
        self.physical_marker_size_mm = physical_marker_size_mm
        self.dictionary_id = dictionary_id

        self.aruco_dict = cv2.aruco.getPredefinedDictionary(self.dictionary_id)
        if hasattr(cv2.aruco, "ArucoDetector"):
            self.detector_params = cv2.aruco.DetectorParameters()
            self.detector = cv2.aruco.ArucoDetector(self.aruco_dict, self.detector_params)
        else:
            self.detector_params = cv2.aruco.DetectorParameters_create()
            self.detector = None

        self.last_scale_mm_per_px: Optional[float] = None
        self.last_homography_matrix: Optional[np.ndarray] = None
        self.is_calibrated: bool = False

    def detect_and_calibrate(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Detects ArUco marker in frame and computes scale (mm/pixel) & homography matrix.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame

        if self.detector is not None:
            corners, ids, rejected = self.detector.detectMarkers(gray)
        else:
            corners, ids, rejected = cv2.aruco.detectMarkers(gray, self.aruco_dict, parameters=self.detector_params)

        if ids is not None and len(ids) > 0:
            # Extract first detected marker corners
            c = corners[0][0]  # Shape: (4, 2) [top-left, top-right, bottom-right, bottom-left]
            
            # Compute 4 edge lengths in pixels
            edge1 = np.linalg.norm(c[0] - c[1])
            edge2 = np.linalg.norm(c[1] - c[2])
            edge3 = np.linalg.norm(c[2] - c[3])
            edge4 = np.linalg.norm(c[3] - c[0])
            avg_edge_px = float(np.mean([edge1, edge2, edge3, edge4]))

            if avg_edge_px > 5.0:
                scale_mm_per_px = self.physical_marker_size_mm / avg_edge_px
                self.last_scale_mm_per_px = scale_mm_per_px
                self.is_calibrated = True

                # Compute perspective rectification homography matrix
                dst_pts = np.array([
                    [0, 0],
                    [avg_edge_px, 0],
                    [avg_edge_px, avg_edge_px],
                    [0, avg_edge_px]
                ], dtype=np.float32)

                H_mat, _ = cv2.findHomography(c.astype(np.float32), dst_pts)
                self.last_homography_matrix = H_mat

                return {
                    "marker_detected": True,
                    "marker_id": int(ids[0][0]),
                    "scale_mm_per_px": round(scale_mm_per_px, 5),
                    "marker_edge_px": round(avg_edge_px, 1),
                    "physical_size_mm": self.physical_marker_size_mm,
                    "corners": c.tolist(),
                    "has_homography": H_mat is not None
                }

        return {
            "marker_detected": False,
            "marker_id": None,
            "scale_mm_per_px": self.last_scale_mm_per_px,
            "is_calibrated": self.is_calibrated,
            "has_homography": self.last_homography_matrix is not None
        }

    def draw_detected_marker(self, frame: np.ndarray, calib_info: Dict[str, Any]) -> np.ndarray:
        """Annotates detected ArUco marker boundaries and calibrated scale HUD on the frame."""
        if not calib_info.get("marker_detected"):
            return frame

        annotated = frame.copy()
        corners = np.array(calib_info["corners"], dtype=np.int32)
        cv2.polylines(annotated, [corners], isClosed=True, color=(0, 255, 255), thickness=2)
        
        # Label with marker ID and calibrated scale
        tl = corners[0]
        label = f"ArUco #{calib_info['marker_id']} | {calib_info['scale_mm_per_px']:.4f} mm/px"
        cv2.putText(annotated, label, (tl[0], max(20, tl[1] - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)

        return annotated
