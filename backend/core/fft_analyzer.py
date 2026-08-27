"""
ChronoPhys-Vision: Modal Spectrum & Sub-Pixel FFT Analyzer
Features:
- Physical Calibration: mm/pixel conversion to real-world metric units (um, mm)
- Vibration Velocity RMS (v_RMS in mm/s) calculation for ISO 10816-3 compliance
- Sub-Pixel Phase Correlation tracking with Hanning Windowed rFFT
- Harmonic Peak Identification (1X, 2X, 3X) & Damping Ratio (zeta)
"""

from typing import List, Tuple, Dict, Any, Optional
from collections import deque
import numpy as np
import cv2
from scipy import signal


class SubPixelFFTAnalyzer:
    """
    Sub-pixel modal spectrum and vibration frequency analyzer with physical unit calibration.
    """

    def __init__(
        self,
        fps: float = 30.0,
        buffer_size: int = 128,
        roi: Optional[Tuple[int, int, int, int]] = None,
        scale_mm_per_pixel: float = 0.05
    ):
        self.fps = max(float(fps), 1.0)
        self.buffer_size = int(buffer_size)
        self.roi = roi
        self.scale_mm = float(scale_mm_per_pixel)

        # Displacement history buffers
        self.timestamps = deque(maxlen=self.buffer_size)
        self.disp_x_px = deque(maxlen=self.buffer_size)
        self.disp_y_px = deque(maxlen=self.buffer_size)
        self.disp_mag_px = deque(maxlen=self.buffer_size)
        self.disp_mag_mm = deque(maxlen=self.buffer_size)

        # Reference template for phase correlation
        self.ref_roi_gray: Optional[np.ndarray] = None
        self.prev_roi_gray: Optional[np.ndarray] = None
        self.hann_window = np.hanning(self.buffer_size)

        self.freq_bins = np.fft.rfftfreq(self.buffer_size, d=1.0 / self.fps)

    def set_roi(self, x: int, y: int, w: int, h: int) -> None:
        """Update active Region of Interest (ROI)."""
        self.roi = (max(0, x), max(0, y), max(16, w), max(16, h))
        self.ref_roi_gray = None
        self.prev_roi_gray = None
        self.disp_x_px.clear()
        self.disp_y_px.clear()
        self.disp_mag_px.clear()
        self.disp_mag_mm.clear()
        self.timestamps.clear()

    def set_calibration(self, scale_mm_per_pixel: float) -> None:
        """Update physical calibration scale (mm per pixel)."""
        if scale_mm_per_pixel > 0:
            self.scale_mm = float(scale_mm_per_pixel)

    def update_fps(self, fps: float) -> None:
        """Update stream FPS and recompute frequency bins."""
        if fps > 0 and fps != self.fps:
            self.fps = fps
            self.freq_bins = np.fft.rfftfreq(self.buffer_size, d=1.0 / self.fps)

    def _extract_roi(self, frame: np.ndarray) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        """Extracts and validates ROI patch from frame."""
        h, w = frame.shape[:2]
        if self.roi is None:
            rw, rh = min(160, w), min(160, h)
            rx, ry = (w - rw) // 2, (h - rh) // 2
            current_roi = (rx, ry, rw, rh)
        else:
            rx, ry, rw, rh = self.roi
            rx = max(0, min(rx, w - 16))
            ry = max(0, min(ry, h - 16))
            rw = min(rw, w - rx)
            rh = min(rh, h - ry)
            current_roi = (rx, ry, rw, rh)

        roi_patch = frame[ry:ry + rh, rx:rx + rw]
        if len(roi_patch.shape) == 3:
            roi_gray = cv2.cvtColor(roi_patch, cv2.COLOR_BGR2GRAY)
        else:
            roi_gray = roi_patch

        return roi_gray, current_roi

    def _estimate_subpixel_shift(self, curr_gray: np.ndarray) -> Tuple[float, float]:
        """Estimates sub-pixel 2D shift (dx, dy) using Phase Correlation."""
        if self.ref_roi_gray is None or self.ref_roi_gray.shape != curr_gray.shape:
            self.ref_roi_gray = curr_gray.astype(np.float32)
            self.prev_roi_gray = curr_gray.astype(np.float32)
            return 0.0, 0.0

        curr_f = curr_gray.astype(np.float32)
        hann = cv2.createHanningWindow((curr_f.shape[1], curr_f.shape[0]), cv2.CV_32F)
        shift, _ = cv2.phaseCorrelate(self.ref_roi_gray, curr_f, hann)
        dx, dy = shift

        self.prev_roi_gray = curr_f
        return float(dx), float(dy)

    def process_frame(self, frame: np.ndarray, timestamp: Optional[float] = None) -> Dict[str, Any]:
        """
        Processes frame, tracks sub-pixel displacement, computes FFT, and calculates v_RMS.
        """
        roi_gray, active_roi = self._extract_roi(frame)
        dx_px, dy_px = self._estimate_subpixel_shift(roi_gray)
        mag_px = np.sqrt(dx_px * dx_px + dy_px * dy_px)
        mag_mm = mag_px * self.scale_mm

        if timestamp is None:
            timestamp = len(self.timestamps) / self.fps

        self.timestamps.append(timestamp)
        self.disp_x_px.append(dx_px)
        self.disp_y_px.append(dy_px)
        self.disp_mag_px.append(mag_px)
        self.disp_mag_mm.append(mag_mm)

        telemetry: Dict[str, Any] = {
            "active_roi": active_roi,
            "calibration_mm_per_pixel": self.scale_mm,
            "subpixel_displacement_px": {
                "dx": round(dx_px, 4),
                "dy": round(dy_px, 4),
                "magnitude": round(mag_px, 4)
            },
            "subpixel_displacement_um": {
                "dx_um": round(dx_px * self.scale_mm * 1000.0, 2),
                "dy_um": round(dy_px * self.scale_mm * 1000.0, 2),
                "magnitude_um": round(mag_mm * 1000.0, 2)
            },
            "displacement_peak_mm": round(mag_mm, 4),
            "vibration_velocity_rms_mms": 0.0,
            "dominant_frequency_hz": 0.0,
            "peak_snr_db": 0.0,
            "harmonics": [],
            "spectrum": {
                "frequencies": [],
                "power_spectral_density": []
            },
            "damping_ratio_zeta": 0.0
        }

        if len(self.disp_mag_px) >= self.buffer_size:
            spectrum_results = self._compute_fft_and_velocity()
            telemetry.update(spectrum_results)

        return telemetry

    def _compute_fft_and_velocity(self) -> Dict[str, Any]:
        """
        Computes 1D Fast Fourier Transform and calculates ISO vibration velocity RMS (mm/s).
        """
        disp_mm_array = np.array(self.disp_mag_mm, dtype=np.float32)
        disp_detrended = disp_mm_array - np.mean(disp_mm_array)

        # 1. Direct Time-Domain Numerical Differentiation for Velocity RMS (mm/s)
        # v(t) = d(disp)/dt
        dt = 1.0 / self.fps
        vel_time_series = np.gradient(disp_detrended, dt)
        v_rms_timedomain = float(np.sqrt(np.mean(vel_time_series ** 2)))

        # 2. Windowed Real FFT
        windowed = disp_detrended * self.hann_window
        fft_vals = np.fft.rfft(windowed)
        psd = (np.abs(fft_vals) ** 2) / (self.buffer_size * self.fps)
        psd_clean = np.maximum(psd, 1e-12)

        search_psd = psd_clean.copy()
        if len(search_psd) > 2:
            search_psd[:2] = 0.0

        peaks, _ = signal.find_peaks(
            search_psd,
            prominence=np.max(search_psd) * 0.04 if np.max(search_psd) > 0 else 1e-6,
            distance=2
        )

        dominant_freq = 0.0
        peak_snr = 0.0
        harmonics: List[Dict[str, float]] = []
        damping_zeta = 0.0
        v_rms_harmonic = 0.0

        if len(peaks) > 0:
            peak_powers = search_psd[peaks]
            sorted_indices = np.argsort(peak_powers)[::-1]
            top_peak_idx = peaks[sorted_indices[0]]

            dominant_freq = float(self.freq_bins[top_peak_idx])
            dominant_power = float(peak_powers[sorted_indices[0]])

            # Noise floor & SNR
            noise_floor = float(np.median(search_psd))
            if noise_floor > 0:
                peak_snr = float(10.0 * np.log10(dominant_power / noise_floor))

            # Half-power (-3dB) damping ratio zeta
            half_power = dominant_power / 2.0
            idx_low = top_peak_idx
            while idx_low > 0 and search_psd[idx_low] > half_power:
                idx_low -= 1
            idx_high = top_peak_idx
            while idx_high < len(search_psd) - 1 and search_psd[idx_high] > half_power:
                idx_high += 1
            
            delta_f = max(0.01, self.freq_bins[idx_high] - self.freq_bins[idx_low])
            q_factor = dominant_freq / delta_f if dominant_freq > 0 else 0.0
            if q_factor > 0:
                damping_zeta = float(1.0 / (2.0 * q_factor))

            # Peak displacement amplitude X_peak (mm)
            x_peak_mm = float(np.max(np.abs(disp_detrended)))
            # Harmonic velocity RMS = (2 * pi * f0 * X_peak) / sqrt(2)
            v_rms_harmonic = float((2.0 * np.pi * dominant_freq * x_peak_mm) / np.sqrt(2.0))

            # Extract top 4 harmonic peaks
            for i in range(min(4, len(sorted_indices))):
                p_idx = peaks[sorted_indices[i]]
                f = float(self.freq_bins[p_idx])
                p = float(search_psd[p_idx])
                harmonics.append({
                    "frequency_hz": round(f, 2),
                    "power_db": round(float(10.0 * np.log10(max(p, 1e-12))), 2),
                    "order": round(f / dominant_freq, 2) if dominant_freq > 0 else 1.0
                })

        # Use maximum of harmonic vs broadband velocity RMS for safety
        v_rms_final = max(v_rms_harmonic, v_rms_timedomain)

        step = max(1, len(self.freq_bins) // 64)
        sub_freqs = [round(float(f), 2) for f in self.freq_bins[::step]]
        sub_psd = [round(float(p), 6) for p in psd_clean[::step]]

        return {
            "dominant_frequency_hz": round(dominant_freq, 2),
            "vibration_velocity_rms_mms": round(v_rms_final, 3),
            "peak_snr_db": round(peak_snr, 2),
            "harmonics": harmonics,
            "damping_ratio_zeta": round(damping_zeta, 4),
            "spectrum": {
                "frequencies": sub_freqs,
                "power_spectral_density": sub_psd
            }
        }
