"""
ChronoPhys-Vision: Production Eulerian Video Magnification (EVM) Core Module
Features:
- ROI-Scoped Spatial Magnification: Restricts EVM processing strictly within dynamic ROI
- Alpha Feathering & Seamless Border Blending: Zero background noise and clean boundaries
- Multi-Scale Laplacian/Gaussian Spatial Pyramids with Real-Time IIR Bandpass Filtering
- Real-time Runtime Parameter Tuning (alpha, f_low, f_high, levels)
"""

from typing import List, Tuple, Optional
import numpy as np
import cv2
from scipy import signal


class EulerianVideoMagnifier:
    """
    Production Eulerian Video Magnifier with ROI scoping and boundary feathering.
    """

    def __init__(
        self,
        fps: float = 30.0,
        low_hz: float = 0.5,
        high_hz: float = 6.0,
        alpha: float = 40.0,
        levels: int = 3,
        chrom_attenuation: float = 0.1,
        feather_px: int = 8
    ):
        self.fps = max(float(fps), 1.0)
        self.low_hz = float(low_hz)
        self.high_hz = min(float(high_hz), self.fps / 2.0 - 0.1)
        self.alpha = float(alpha)
        self.levels = max(1, min(int(levels), 5))
        self.chrom_attenuation = float(chrom_attenuation)
        self.feather_px = feather_px

        # IIR Filter state
        self.sos: Optional[np.ndarray] = None
        self._init_filter()

        # Online state tracking per spatial level
        self.iir_states: List[Optional[np.ndarray]] = [None] * (self.levels + 1)
        self.last_roi_shape: Optional[Tuple[int, int]] = None

    def _init_filter(self) -> None:
        """Constructs stable Butterworth bandpass filter coefficients (SOS)."""
        nyquist = self.fps / 2.0
        low = max(0.01, self.low_hz / nyquist)
        high = min(0.99, self.high_hz / nyquist)

        if low >= high:
            low = max(0.01, high - 0.1)

        try:
            self.sos = signal.butter(
                N=2,
                Wn=[low, high],
                btype="bandpass",
                output="sos"
            )
        except Exception:
            self.sos = signal.butter(
                N=2,
                Wn=high,
                btype="lowpass",
                output="sos"
            )

    def update_params(
        self,
        fps: Optional[float] = None,
        low_hz: Optional[float] = None,
        high_hz: Optional[float] = None,
        alpha: Optional[float] = None,
        levels: Optional[int] = None
    ) -> None:
        """Dynamically update magnification parameters at runtime."""
        changed_filter = False
        if fps is not None and fps > 0 and fps != self.fps:
            self.fps = fps
            changed_filter = True
        if low_hz is not None and low_hz != self.low_hz:
            self.low_hz = max(0.1, low_hz)
            changed_filter = True
        if high_hz is not None and high_hz != self.high_hz:
            self.high_hz = min(high_hz, self.fps / 2.0 - 0.1)
            changed_filter = True
        if alpha is not None:
            self.alpha = float(alpha)
        if levels is not None and levels != self.levels:
            self.levels = max(1, min(int(levels), 5))
            self.reset()
            return

        if changed_filter:
            self._init_filter()
            self.reset()

    def reset(self) -> None:
        """Reset internal filter states and buffers."""
        self.iir_states = [None] * (self.levels + 1)
        self.last_roi_shape = None

    def build_gaussian_pyramid(self, frame: np.ndarray, levels: int) -> List[np.ndarray]:
        """Decompose frame into Gaussian pyramid."""
        pyramid = [frame.astype(np.float32)]
        current = frame.astype(np.float32)
        for _ in range(levels):
            current = cv2.pyrDown(current)
            pyramid.append(current)
        return pyramid

    def build_laplacian_pyramid(self, frame: np.ndarray, levels: int) -> List[np.ndarray]:
        """Decompose frame into Laplacian multi-scale spatial pyramid."""
        gaussian_pyr = self.build_gaussian_pyramid(frame, levels)
        laplacian_pyr: List[np.ndarray] = []
        for i in range(levels):
            size = (gaussian_pyr[i].shape[1], gaussian_pyr[i].shape[0])
            expanded = cv2.pyrUp(gaussian_pyr[i + 1], dstsize=size)
            laplacian = gaussian_pyr[i] - expanded
            laplacian_pyr.append(laplacian)
        laplacian_pyr.append(gaussian_pyr[-1])
        return laplacian_pyr

    def collapse_laplacian_pyramid(self, laplacian_pyr: List[np.ndarray]) -> np.ndarray:
        """Reconstruct full-resolution frame from Laplacian pyramid."""
        current = laplacian_pyr[-1]
        for i in range(len(laplacian_pyr) - 2, -1, -1):
            size = (laplacian_pyr[i].shape[1], laplacian_pyr[i].shape[0])
            expanded = cv2.pyrUp(current, dstsize=size)
            current = laplacian_pyr[i] + expanded
        return current

    def _filter_level_streaming(self, pyr_level: np.ndarray, level_idx: int) -> np.ndarray:
        """Online IIR Butterworth filtering per spatial level."""
        if self.sos is None:
            return np.zeros_like(pyr_level)

        h, w, c = pyr_level.shape
        flat_data = pyr_level.reshape(-1, c)

        n_sections = self.sos.shape[0]
        if self.iir_states[level_idx] is None or self.iir_states[level_idx].shape[1] != flat_data.shape[0]:
            self.iir_states[level_idx] = np.zeros((n_sections, flat_data.shape[0], 2, c), dtype=np.float32)

        state = self.iir_states[level_idx]
        filtered_flat = np.zeros_like(flat_data)

        for ch in range(c):
            x = flat_data[:, ch]
            for s in range(n_sections):
                b0, b1, b2, a0, a1, a2 = self.sos[s]
                w0 = state[s, :, 0, ch]
                w1 = state[s, :, 1, ch]

                y = b0 * x + w0
                w0_new = b1 * x - a1 * y + w1
                w1_new = b2 * x - a2 * y

                state[s, :, 0, ch] = w0_new
                state[s, :, 1, ch] = w1_new
                x = y
            filtered_flat[:, ch] = x

        return filtered_flat.reshape(h, w, c)

    def _process_patch(self, patch_bgr: np.ndarray) -> np.ndarray:
        """Processes a single image patch through Laplacian EVM."""
        patch_norm = patch_bgr.astype(np.float32) / 255.0
        patch_ycrcb = cv2.cvtColor(patch_norm, cv2.COLOR_BGR2YCrCb)

        lap_pyr = self.build_laplacian_pyramid(patch_ycrcb, self.levels)
        filtered_pyr: List[np.ndarray] = []

        for i in range(len(lap_pyr)):
            if i == len(lap_pyr) - 1:
                filtered_pyr.append(np.zeros_like(lap_pyr[i]))
                continue

            filtered_level = self._filter_level_streaming(lap_pyr[i], i)

            # Spatial wavelength cutoff
            level_alpha = self.alpha * (0.5 ** (self.levels - 1 - i))
            level_alpha = max(1.0, min(level_alpha, self.alpha))

            # Chrominance attenuation
            filtered_level[:, :, 0] *= level_alpha
            filtered_level[:, :, 1] *= (level_alpha * self.chrom_attenuation)
            filtered_level[:, :, 2] *= (level_alpha * self.chrom_attenuation)

            filtered_pyr.append(filtered_level)

        magnified_pyr = [lap_pyr[i] + filtered_pyr[i] for i in range(len(lap_pyr))]
        recon_ycrcb = self.collapse_laplacian_pyramid(magnified_pyr)
        recon_ycrcb = np.clip(recon_ycrcb, 0.0, 1.0)
        recon_bgr = cv2.cvtColor(recon_ycrcb, cv2.COLOR_YCrCb2BGR)
        return (recon_bgr * 255.0).astype(np.uint8)

    def process_frame(
        self,
        frame: np.ndarray,
        roi: Optional[Tuple[int, int, int, int]] = None
    ) -> np.ndarray:
        """
        Process frame with optional ROI-scoping.
        If ROI is provided, EVM is executed strictly on the ROI patch and blended
        seamlessly with feathered edges, leaving the background pristine and noise-free.
        """
        if roi is None:
            # Full frame processing
            return self._process_patch(frame)

        rx, ry, rw, rh = roi
        fh, fw = frame.shape[:2]

        # Clamp ROI to frame bounds
        rx = max(0, min(rx, fw - 32))
        ry = max(0, min(ry, fh - 32))
        rw = max(32, min(rw, fw - rx))
        rh = max(32, min(rh, fh - ry))

        # Ensure dimensions are multiples of 2^levels for clean pyramid down/up
        align = 2 ** self.levels
        rw = (rw // align) * align
        rh = (rh // align) * align
        if rw < align or rh < align:
            return frame.copy()

        # Check if ROI size changed; reset states if needed
        curr_shape = (rh, rw)
        if self.last_roi_shape != curr_shape:
            self.reset()
            self.last_roi_shape = curr_shape

        # Extract ROI patch
        patch = frame[ry:ry + rh, rx:rx + rw]
        mag_patch = self._process_patch(patch)

        # Composite magnified patch into original frame with border feathering
        result = frame.copy()
        
        # Create feathered 2D alpha mask
        if self.feather_px > 0 and rw > 2 * self.feather_px and rh > 2 * self.feather_px:
            mask = np.ones((rh, rw), dtype=np.float32)
            feather = min(self.feather_px, min(rw, rh) // 4)
            for f in range(feather):
                val = float(f) / float(feather)
                mask[f, :] = np.minimum(mask[f, :], val)
                mask[rh - 1 - f, :] = np.minimum(mask[rh - 1 - f, :], val)
                mask[:, f] = np.minimum(mask[:, f], val)
                mask[:, rw - 1 - f] = np.minimum(mask[:, rw - 1 - f], val)
            
            mask = cv2.GaussianBlur(mask, (5, 5), 0)[:, :, np.newaxis]
            blended_patch = (mag_patch.astype(np.float32) * mask + patch.astype(np.float32) * (1.0 - mask)).astype(np.uint8)
            result[ry:ry + rh, rx:rx + rw] = blended_patch
        else:
            result[ry:ry + rh, rx:rx + rw] = mag_patch

        return result


class SyntheticVibrationGenerator:
    """
    Synthetic physics-based micro-vibration scene generator with selectable harmonic faults.
    """

    def __init__(
        self,
        width: int = 640,
        height: int = 480,
        fps: float = 30.0,
        target_frequency_hz: float = 3.5,
        displacement_amplitude_px: float = 0.6,
        noise_level: float = 0.01,
        fault_type: str = "unbalance"
    ):
        self.width = width
        self.height = height
        self.fps = fps
        self.freq = target_frequency_hz
        self.amp = displacement_amplitude_px
        self.noise = noise_level
        self.fault_type = fault_type
        self.frame_idx = 0

    def get_next_frame(self) -> np.ndarray:
        """Renders next synthetic frame with modal vibration harmonics."""
        t = self.frame_idx / self.fps
        self.frame_idx += 1

        # Base canvas
        frame = np.full((self.height, self.width, 3), 35, dtype=np.float32)

        # Industrial grid
        for x in range(0, self.width, 40):
            cv2.line(frame, (x, 0), (x, self.height), (48, 54, 65), 1)
        for y in range(0, self.height, 40):
            cv2.line(frame, (0, y), (self.width, y), (48, 54, 65), 1)

        # 1X Fundamental vibration (Unbalance)
        dy = self.amp * np.sin(2.0 * np.pi * self.freq * t)

        # 2X Harmonic vibration (Misalignment)
        if self.fault_type in ("misalignment", "resonance", "unbalance"):
            dy += (0.35 * self.amp) * np.sin(2.0 * np.pi * (2.0 * self.freq) * t)

        # High frequency defect spikes
        if self.fault_type == "looseness":
            dy += (0.25 * self.amp) * np.sin(2.0 * np.pi * (3.0 * self.freq) * t)
            dy += (0.15 * self.amp) * np.sin(2.0 * np.pi * (4.2 * self.freq) * t)

        # Draw machine housing / rotor shaft
        beam_x1, beam_y1 = 100, int(self.height / 2 - 40 + dy)
        beam_x2, beam_y2 = self.width - 100, int(self.height / 2 + 40 + dy)

        cv2.rectangle(frame, (beam_x1, beam_y1), (beam_x2, beam_y2), (160, 150, 140), -1)
        cv2.rectangle(frame, (beam_x1, beam_y1), (beam_x2, beam_y2), (210, 200, 190), 2)

        # High-contrast optical target disc
        marker_cx = int(self.width / 2)
        marker_cy = int(self.height / 2 + dy)
        cv2.circle(frame, (marker_cx, marker_cy), 28, (0, 140, 255), -1)
        cv2.circle(frame, (marker_cx, marker_cy), 14, (255, 255, 255), -1)
        cv2.circle(frame, (marker_cx, marker_cy), 4, (20, 20, 20), -1)

        if self.noise > 0:
            noise_map = np.random.normal(0, self.noise * 255.0, frame.shape).astype(np.float32)
            frame = frame + noise_map

        return np.clip(frame, 0, 255).astype(np.uint8)
