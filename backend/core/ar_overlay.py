"""
ChronoPhys-Vision: Augmented Reality (AR) Dynamic Vibration Stress Heatmap Overlay
Features:
- Real-time Sub-Pixel Strain & Kinetic Energy Field Estimation
- Dynamic Thermal Colormap (Green -> Yellow -> Red) mapping instantaneous stress intensity
- Isolines, Peak Stress Concentrator Pins, and Alpha Blending Overlay
"""

from typing import Tuple, Optional
import numpy as np
import cv2


class ARStressHeatmapOverlay:
    """
    Renders live Augmented Reality stress & vibration intensity heatmaps on video frames.
    """

    def __init__(
        self,
        grid_step: int = 16,
        alpha_blend: float = 0.45,
        smoothing_factor: float = 0.3
    ):
        self.grid_step = max(8, int(grid_step))
        self.alpha = float(alpha_blend)
        self.smoothing = float(smoothing_factor)
        
        self.prev_gray: Optional[np.ndarray] = None
        self.smoothed_mag: Optional[np.ndarray] = None

    def render_overlay(
        self,
        frame: np.ndarray,
        active_roi: Optional[Tuple[int, int, int, int]] = None,
        scale_gain: float = 12.0
    ) -> np.ndarray:
        """
        Computes dense optical flow field and renders dynamic AR stress heatmap.
        """
        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = curr_gray.shape

        if self.prev_gray is None or self.prev_gray.shape != curr_gray.shape:
            self.prev_gray = curr_gray
            self.smoothed_mag = np.zeros((h, w), dtype=np.float32)
            return frame.copy()

        # Compute optical flow (Farneback dense flow on downsampled grid for 60 FPS real-time speed)
        small_w = max(64, w // 2)
        small_h = max(48, h // 2)
        gray_small = cv2.resize(curr_gray, (small_w, small_h))
        prev_small = cv2.resize(self.prev_gray, (small_w, small_h))

        flow = cv2.calcOpticalFlowFarneback(
            prev_small, gray_small, None,
            pyr_scale=0.5, levels=2, winsize=13, iterations=2, poly_n=5, poly_sigma=1.1, flags=0
        )
        self.prev_gray = curr_gray

        # Flow magnitude
        fx, fy = flow[:, :, 0], flow[:, :, 1]
        mag_small = np.sqrt(fx * fx + fy * fy)

        # Upsample magnitude to full frame
        mag_full = cv2.resize(mag_small, (w, h))

        # Restrict to ROI if provided, or mask background
        if active_roi is not None:
            rx, ry, rw, rh = active_roi
            roi_mask = np.zeros((h, w), dtype=np.float32)
            cv2.rectangle(roi_mask, (rx, ry), (rx + rw, ry + rh), 1.0, -1)
            mag_full = mag_full * roi_mask

        # Exponential temporal smoothing to avoid flicker
        if self.smoothed_mag is None or self.smoothed_mag.shape != mag_full.shape:
            self.smoothed_mag = mag_full
        else:
            self.smoothed_mag = self.smoothing * mag_full + (1.0 - self.smoothing) * self.smoothed_mag

        # Normalize and map to colormap
        norm_mag = np.clip(self.smoothed_mag * scale_gain * 255.0, 0, 255).astype(np.uint8)
        
        # Apply Turbo / Jet colormap (Blue/Green -> Yellow -> Red)
        heatmap = cv2.applyColorMap(norm_mag, cv2.COLORMAP_TURBO)

        # Mask out very low noise areas
        intensity_mask = (norm_mag > 25).astype(np.float32)[:, :, np.newaxis]
        
        # Alpha compositing: frame * (1 - alpha*mask) + heatmap * (alpha*mask)
        effective_alpha = self.alpha * intensity_mask
        blended = (frame.astype(np.float32) * (1.0 - effective_alpha) + heatmap.astype(np.float32) * effective_alpha).astype(np.uint8)

        # Draw AR isolines / contours for peak stress regions
        contours, _ = cv2.findContours((norm_mag > 160).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(blended, contours, -1, (0, 0, 255), 1)

        # Identify and pinpoint peak stress concentrator
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(norm_mag)
        if max_val > 140:
            cv2.circle(blended, max_loc, 8, (0, 0, 255), 2)
            cv2.circle(blended, max_loc, 2, (255, 255, 255), -1)
            cv2.putText(blended, "STRESS PEAK", (max_loc[0] + 12, max_loc[1] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)

        return blended
