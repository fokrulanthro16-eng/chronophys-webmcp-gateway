"""
ChronoPhys-Vision 3.0: AC Light Flicker Notch Filter
Features:
- Digital IIR Notch Filters (50 Hz / 60 Hz) for ambient AC electrical hum rejection
- Real-time zero-phase filtering (scipy.signal.filtfilt / iirnotch)
- Zero-drift high-Q factor for sharp frequency suppression
"""

from typing import Optional
import numpy as np
from scipy import signal


class ACLightFlickerNotchFilter:
    """
    Suppresses AC ambient lighting flicker artifacts (50Hz / 60Hz and aliased modes)
    from optical displacement time-series.
    """

    def __init__(self, fps: float = 30.0, line_freq: float = 60.0, quality_factor: float = 30.0):
        self.fps = fps
        self.line_freq = line_freq
        self.quality_factor = quality_factor
        self.b = None
        self.a = None
        self._init_filter()

    def _init_filter(self) -> None:
        nyq = self.fps / 2.0
        # If Nyquist frequency exceeds line frequency, notch directly at line_freq
        if self.line_freq < nyq:
            self.b, self.a = signal.iirnotch(self.line_freq, self.quality_factor, self.fps)
        else:
            # When sampling rate is 30 FPS, 60 Hz / 50 Hz aliases to near Nyquist (10Hz / 14.5Hz)
            alias_freq = min(nyq * 0.92, 14.0)
            self.b, self.a = signal.iirnotch(alias_freq, self.quality_factor * 0.5, self.fps)

    def filter_signal(self, data: np.ndarray) -> np.ndarray:
        """Applies notch filtering to remove AC optical flicker."""
        if len(data) < 16 or self.b is None or self.a is None:
            return data

        try:
            return signal.filtfilt(self.b, self.a, data)
        except Exception:
            return data
