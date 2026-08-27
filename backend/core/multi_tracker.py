"""
ChronoPhys-Vision: Multi-ROI Simultaneous Tracking & Cross-Spectral Phase Analysis
Features:
- Concurrent Multi-Point Sub-Pixel Tracking (DE Bearing, NDE Bearing, Foundation Base)
- Cross-Spectral Density S_xy(f) & Phase Angle Difference (Delta Theta)
- Mechanical Fault Phase Discrimination (In-Phase Unbalance vs Out-of-Phase Misalignment vs Soft Foot)
"""

from typing import List, Tuple, Dict, Any, Optional
from collections import deque
import numpy as np
import cv2
from scipy import signal


class ROIPoint:
    """Represents a single tracking target on the machinery structure."""
    def __init__(self, name: str, bbox: Tuple[int, int, int, int], buffer_size: int = 128):
        self.name = name
        self.bbox = bbox  # (x, y, w, h)
        self.buffer_size = buffer_size
        
        self.disp_x = deque(maxlen=buffer_size)
        self.disp_y = deque(maxlen=buffer_size)
        self.disp_mag_mm = deque(maxlen=buffer_size)
        self.timestamps = deque(maxlen=buffer_size)
        
        self.ref_gray: Optional[np.ndarray] = None
        self.dominant_freq = 0.0
        self.v_rms_mms = 0.0


class MultiROITracker:
    """
    Multi-ROI Simultaneous Sub-Pixel Tracker and Cross-Spectral Phase Analyzer.
    """

    def __init__(self, fps: float = 30.0, buffer_size: int = 128, scale_mm_per_pixel: float = 0.05):
        self.fps = max(float(fps), 1.0)
        self.buffer_size = int(buffer_size)
        self.scale_mm = float(scale_mm_per_pixel)
        self.hann_window = np.hanning(self.buffer_size)
        self.freq_bins = np.fft.rfftfreq(self.buffer_size, d=1.0 / self.fps)

        # Default 3 ROIs: DE Bearing (Left), NDE Bearing (Right), Base (Bottom)
        self.rois: Dict[str, ROIPoint] = {}
        self._init_default_rois()

    def _init_default_rois(self) -> None:
        """Initializes default 3-point industrial layout."""
        self.rois = {
            "DE_BEARING": ROIPoint("Drive-End Bearing (DE)", (160, 200, 100, 100), self.buffer_size),
            "NDE_BEARING": ROIPoint("Non-Drive End (NDE)", (380, 200, 100, 100), self.buffer_size),
            "BASE_FOUNDATION": ROIPoint("Foundation Base", (270, 360, 100, 80), self.buffer_size)
        }

    def set_roi_coords(self, roi_id: str, x: int, y: int, w: int, h: int) -> None:
        """Updates bounding box for a specific ROI."""
        if roi_id in self.rois:
            self.rois[roi_id].bbox = (max(0, x), max(0, y), max(24, w), max(24, h))
            self.rois[roi_id].ref_gray = None
            self.rois[roi_id].disp_mag_mm.clear()

    def set_calibration(self, scale_mm_per_pixel: float) -> None:
        """Updates physical calibration scale."""
        if scale_mm_per_pixel > 0:
            self.scale_mm = float(scale_mm_per_pixel)

    def update_fps(self, fps: float) -> None:
        if fps > 0 and fps != self.fps:
            self.fps = fps
            self.freq_bins = np.fft.rfftfreq(self.buffer_size, d=1.0 / self.fps)

    def _track_single_roi(self, frame: np.ndarray, roi: ROIPoint, timestamp: float) -> Tuple[float, float, float]:
        """Tracks sub-pixel displacement on a single ROI."""
        fh, fw = frame.shape[:2]
        rx, ry, rw, rh = roi.bbox
        rx = max(0, min(rx, fw - 16))
        ry = max(0, min(ry, fh - 16))
        rw = min(rw, fw - rx)
        rh = min(rh, fh - ry)

        patch = frame[ry:ry + rh, rx:rx + rw]
        if len(patch.shape) == 3:
            curr_gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
        else:
            curr_gray = patch

        if roi.ref_gray is None or roi.ref_gray.shape != curr_gray.shape:
            roi.ref_gray = curr_gray.astype(np.float32)
            dx, dy = 0.0, 0.0
        else:
            curr_f = curr_gray.astype(np.float32)
            hann = cv2.createHanningWindow((curr_f.shape[1], curr_f.shape[0]), cv2.CV_32F)
            shift, _ = cv2.phaseCorrelate(roi.ref_gray, curr_f, hann)
            dx, dy = float(shift[0]), float(shift[1])

        mag_px = np.sqrt(dx * dx + dy * dy)
        mag_mm = mag_px * self.scale_mm

        roi.timestamps.append(timestamp)
        roi.disp_x.append(dx)
        roi.disp_y.append(dy)
        roi.disp_mag_mm.append(mag_mm)

        return dx, dy, mag_mm

    def process_frame(self, frame: np.ndarray, timestamp: float) -> Dict[str, Any]:
        """
        Tracks all ROIs concurrently and computes cross-spectral phase differences.
        """
        roi_results: Dict[str, Any] = {}

        # 1. Track each ROI
        for roi_id, roi in self.rois.items():
            dx, dy, mag_mm = self._track_single_roi(frame, roi, timestamp)
            
            dom_freq = 0.0
            v_rms = 0.0
            if len(roi.disp_mag_mm) >= self.buffer_size:
                data = np.array(roi.disp_mag_mm, dtype=np.float32)
                data_detrended = data - np.mean(data)
                
                # Velocity RMS (mm/s)
                dt = 1.0 / self.fps
                vel = np.gradient(data_detrended, dt)
                v_rms = float(np.sqrt(np.mean(vel ** 2)))
                
                # FFT
                w = data_detrended * self.hann_window
                fft_vals = np.fft.rfft(w)
                psd = (np.abs(fft_vals) ** 2)
                if len(psd) > 2:
                    psd[:2] = 0.0
                peak_idx = int(np.argmax(psd))
                dom_freq = float(self.freq_bins[peak_idx])

            roi.dominant_freq = dom_freq
            roi.v_rms_mms = v_rms

            roi_results[roi_id] = {
                "name": roi.name,
                "bbox": roi.bbox,
                "disp_dx_px": round(dx, 4),
                "disp_dy_px": round(dy, 4),
                "disp_mag_um": round(mag_mm * 1000.0, 2),
                "v_rms_mms": round(v_rms, 3),
                "dominant_freq_hz": round(dom_freq, 2)
            }

        # 2. Compute Cross-Spectral Phase Difference between DE and NDE
        phase_analysis = self._compute_cross_phase("DE_BEARING", "NDE_BEARING")
        base_analysis = self._compute_cross_phase("DE_BEARING", "BASE_FOUNDATION")

        return {
            "rois": roi_results,
            "phase_analysis": {
                "de_vs_nde": phase_analysis,
                "de_vs_base": base_analysis
            }
        }

    def _compute_cross_phase(self, id_a: str, id_b: str) -> Dict[str, Any]:
        """
        Computes Cross-Spectral Density S_xy(f) and phase angle Delta Theta.
        """
        if id_a not in self.rois or id_b not in self.rois:
            return {"phase_deg": 0.0, "relationship": "UNKNOWN", "coherence": 0.0}

        roi_a = self.rois[id_a]
        roi_b = self.rois[id_b]

        if len(roi_a.disp_mag_mm) < self.buffer_size or len(roi_b.disp_mag_mm) < self.buffer_size:
            return {"phase_deg": 0.0, "relationship": "BUFFERING", "coherence": 0.0}

        sig_a = np.array(roi_a.disp_mag_mm, dtype=np.float32) - np.mean(roi_a.disp_mag_mm)
        sig_b = np.array(roi_b.disp_mag_mm, dtype=np.float32) - np.mean(roi_b.disp_mag_mm)

        # Windowed FFTs
        fft_a = np.fft.rfft(sig_a * self.hann_window)
        fft_b = np.fft.rfft(sig_b * self.hann_window)

        # Cross-Spectral Density: S_xy = FFT_a * conj(FFT_b)
        s_xy = fft_a * np.conj(fft_b)

        # Find dominant peak frequency index
        psd_a = np.abs(fft_a) ** 2
        if len(psd_a) > 2:
            psd_a[:2] = 0.0
        peak_idx = int(np.argmax(psd_a))

        # Phase angle in degrees: atan2(Im, Re)
        cross_val = s_xy[peak_idx]
        phase_rad = np.angle(cross_val)
        phase_deg = float(np.degrees(phase_rad))

        # Magnitude-Squared Coherence gamma^2
        p_xx = np.abs(fft_a[peak_idx]) ** 2
        p_yy = np.abs(fft_b[peak_idx]) ** 2
        coherence = float((np.abs(cross_val) ** 2) / (p_xx * p_yy + 1e-12))
        coherence = min(1.0, max(0.0, coherence))

        # Mechanical interpretation
        abs_phase = abs(phase_deg)
        if abs_phase <= 35.0:
            rel = "IN_PHASE_0_DEG"
            desc = "In-Phase: Rigid body translatory motion (Unbalance dominant)"
        elif 145.0 <= abs_phase <= 180.0 or 180.0 <= abs_phase <= 215.0:
            rel = "OUT_OF_PHASE_180_DEG"
            desc = "Out-of-Phase: Angular/Parallel Misalignment or Rocking Mode"
        elif 60.0 <= abs_phase <= 120.0:
            rel = "QUADRATURE_90_DEG"
            desc = "Quadrature: Damping phase lag / traveling wave"
        else:
            rel = f"INTERMEDIATE_{int(phase_deg)}_DEG"
            desc = f"Complex modal phase shift ({phase_deg:.1f}°)"

        return {
            "phase_deg": round(phase_deg, 1),
            "relationship": rel,
            "description": desc,
            "coherence": round(coherence, 3),
            "freq_hz": round(float(self.freq_bins[peak_idx]), 2)
        }
