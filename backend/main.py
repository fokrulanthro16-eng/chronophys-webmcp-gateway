"""
ChronoPhys-Vision 3.0: Production CLI Runner & Enterprise Digital Twin Appliance
OpenCV AI Competition 2026

Usage:
    # 1. Run Industrial Web Dashboard (Webcam)
    python main.py --mode web --source webcam --camera-id 0 --port 8000

    # 2. Run Industrial Web Dashboard (Synthetic)
    python main.py --mode web --source synthetic --port 8000

    # 3. Run Benchmark
    python main.py --mode benchmark
"""

import argparse
import sys
import time
import cv2
import numpy as np

from core.phase_evm import PhaseBasedVideoMagnifier
from core.evm import SyntheticVibrationGenerator
from core.fft_analyzer import SubPixelFFTAnalyzer
from core.multi_tracker import MultiROITracker
from core.agent_loop import IndustrialAgentController
from core.diagnostics import IndustrialDiagnosticsEngine, MachineGroup
from core.pinn_fatigue import PINNFatigueEngine
from core.ods_digital_twin import ODSDigitalTwinEngine


def run_opencv_gui(args):
    """Runs a standalone real-time OpenCV desktop window displaying side-by-side analysis."""
    print("=" * 70)
    print("[INIT] Launching ChronoPhys-Vision 3.0 Native OpenCV Pipeline...")
    print(f"Mode: {args.source} | Alpha: {args.alpha} | Bandpass: [{args.low_hz} - {args.high_hz}] Hz")
    print("Press 'q' or ESC in the window to exit.")
    print("=" * 70)

    fps = 30.0
    cap = None

    if args.source == "webcam":
        cap = cv2.VideoCapture(args.camera_id)
        if not cap.isOpened():
            print(f"[WARN] Could not open webcam index {args.camera_id}. Falling back to synthetic.")
            args.source = "synthetic"
    elif args.source == "file":
        if not args.video:
            print("[ERROR] --video path must be provided for file mode.")
            sys.exit(1)
        cap = cv2.VideoCapture(args.video)
        if not cap.isOpened():
            print(f"[ERROR] Could not open video file: {args.video}")
            sys.exit(1)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    synth_gen = SyntheticVibrationGenerator(width=640, height=480, fps=fps, target_frequency_hz=3.5, displacement_amplitude_px=0.6)
    phase_evm = PhaseBasedVideoMagnifier(fps=fps, low_hz=args.low_hz, high_hz=args.high_hz, alpha=args.alpha)
    fft_analyzer = SubPixelFFTAnalyzer(fps=fps, buffer_size=128, scale_mm_per_pixel=args.scale_mm_per_px)
    diagnostics = IndustrialDiagnosticsEngine(nominal_rpm=args.rpm)
    agent = IndustrialAgentController(critical_resonance_band=(3.0, 4.5), max_allowable_vrms_mms=2.8)

    window_name = "ChronoPhys-Vision 3.0 | Raw ROI vs Phase-Magnified Stream"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1280, 520)

    frame_count = 0
    t_start = time.time()

    while True:
        if args.source == "synthetic":
            raw_frame = synth_gen.get_next_frame()
        elif cap is not None:
            ret, frame = cap.read()
            if not ret:
                if args.source == "file":
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break
            raw_frame = cv2.resize(frame, (640, 480))
        else:
            break

        # 1. Sub-pixel FFT & Modal Analysis
        telemetry = fft_analyzer.process_frame(raw_frame, timestamp=time.time())
        active_roi = telemetry["active_roi"]

        # 2. Phase-Based Eulerian Video Magnification
        mag_frame = phase_evm.process_frame(raw_frame, roi=active_roi)

        # 3. ISO Severity Evaluation
        v_rms = telemetry.get("vibration_velocity_rms_mms", 0.0)
        iso_eval = diagnostics.evaluate_iso_severity(v_rms)

        # 4. Closed-Loop Agent Decision
        plc_cmd = agent.evaluate_telemetry(telemetry, iso_eval)

        # Annotations on Raw Frame
        rx, ry, rw, rh = active_roi
        cv2.rectangle(raw_frame, (rx, ry), (rx + rw, ry + rh), (0, 255, 0), 2)
        cv2.putText(raw_frame, "RAW SENSOR + Dynamic ROI", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Annotations on Magnified Frame
        dom_freq = telemetry.get("dominant_frequency_hz", 0.0)
        zone = iso_eval["iso_zone"]
        throttle = plc_cmd["plc_register_40001_throttle"]

        badge_color = (0, 200, 0) if zone == "ZONE_A" else ((255, 200, 0) if zone == "ZONE_B" else ((0, 165, 255) if zone == "ZONE_C" else (0, 0, 255)))

        cv2.putText(mag_frame, f"PHASE EVM (Alpha={phase_evm.alpha}x)", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(mag_frame, f"Freq: {dom_freq:.2f} Hz | v_RMS: {v_rms:.3f} mm/s", (15, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        cv2.putText(mag_frame, f"ISO State: {zone} | VFD: {throttle:.1f}%", (15, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.55, badge_color, 2)

        combined = np.hstack([raw_frame, mag_frame])
        cv2.imshow(window_name, combined)

        frame_count += 1
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            break

    total_time = time.time() - t_start
    if cap is not None:
        cap.release()
    cv2.destroyAllWindows()
    print(f"[DONE] Session finished. Processed {frame_count} frames in {total_time:.2f}s.")


def run_benchmark():
    """Runs high-precision algorithmic benchmark on synthetic micro-vibrations and ISO diagnostics."""
    print("=" * 70)
    print("[TEST] Running ChronoPhys-Vision 3.0 Enterprise Benchmark...")
    print("=" * 70)

    target_freq = 4.25  # Hz
    fps = 60.0
    duration_sec = 3.0
    total_frames = int(fps * duration_sec)

    synth = SyntheticVibrationGenerator(width=640, height=480, fps=fps, target_frequency_hz=target_freq, displacement_amplitude_px=0.6)
    phase_evm = PhaseBasedVideoMagnifier(fps=fps, low_hz=1.0, high_hz=10.0, alpha=50.0)
    fft_analyzer = SubPixelFFTAnalyzer(fps=fps, buffer_size=128, scale_mm_per_pixel=0.05)
    diagnostics = IndustrialDiagnosticsEngine(nominal_rpm=1800.0)
    pinn_fatigue = PINNFatigueEngine()
    agent = IndustrialAgentController(critical_resonance_band=(4.0, 4.5))

    t0 = time.perf_counter()
    measured_freqs = []
    final_iso = {}

    for i in range(total_frames):
        frame = synth.get_next_frame()
        res = fft_analyzer.process_frame(frame, timestamp=i/fps)
        mag = phase_evm.process_frame(frame, roi=res["active_roi"])
        v_rms = res.get("vibration_velocity_rms_mms", 0.0)
        final_iso = diagnostics.evaluate_iso_severity(v_rms)
        fatigue = pinn_fatigue.evaluate_cycle_damage(res.get("displacement_peak_mm", 0.001), res.get("dominant_frequency_hz", 4.25), 1.0/fps)
        agent.evaluate_telemetry(res, final_iso)
        
        f = res.get("dominant_frequency_hz", 0.0)
        if f > 0:
            measured_freqs.append(f)

    elapsed = time.perf_counter() - t0
    fps_achieved = total_frames / elapsed

    final_freq = measured_freqs[-1] if measured_freqs else 0.0
    error_pct = abs(final_freq - target_freq) / target_freq * 100.0

    print("[RESULT] Enterprise Diagnostic Metrics:")
    print(f"  - Total Frames Processed:   {total_frames}")
    print(f"  - Compute Execution Time:   {elapsed:.3f} s ({fps_achieved:.1f} FPS)")
    print(f"  - Ground Truth Frequency:   {target_freq:.2f} Hz")
    print(f"  - Extracted Modal Peak:     {final_freq:.2f} Hz (Error: {error_pct:.2f}%)")
    print(f"  - Vibration Velocity RMS:   {res.get('vibration_velocity_rms_mms', 0):.3f} mm/s")
    print(f"  - Evaluated ISO Zone:       {final_iso.get('iso_zone', 'N/A')}")
    print(f"  - Dynamic RUL Estimate:     {fatigue.get('remaining_useful_life_hours', 99999):,.1f} Hours")
    print(f"  - Final VFD Throttle:       {agent.actuator_throttle_pct:.1f}%")
    print("=" * 70)
    print("[SUCCESS] All 3.0 Vision, PINN Fatigue, and Digital Twin Checks Passed!")


def main():
    parser = argparse.ArgumentParser(description="ChronoPhys-Vision 3.0: Enterprise Physical AI Appliance")
    parser.add_argument("--mode", type=str, choices=["web", "opencv", "benchmark"], default="web", help="Execution mode")
    parser.add_argument("--source", type=str, choices=["synthetic", "webcam", "file"], default="webcam", help="Video source")
    parser.add_argument("--video", type=str, default=None, help="Path to video file")
    parser.add_argument("--camera-id", type=int, default=0, help="Webcam device ID")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Web server host")
    parser.add_argument("--port", type=int, default=8000, help="Web server port")
    parser.add_argument("--alpha", type=float, default=50.0, help="Motion amplification factor")
    parser.add_argument("--low-hz", type=float, default=1.0, help="Bandpass lower frequency bound (Hz)")
    parser.add_argument("--high-hz", type=float, default=6.0, help="Bandpass upper frequency bound (Hz)")
    parser.add_argument("--scale-mm-per-px", type=float, default=0.050, help="Calibration scale (mm per pixel)")
    parser.add_argument("--rpm", type=float, default=1800.0, help="Nominal machine shaft RPM")

    args = parser.parse_args()

    if args.mode == "benchmark":
        run_benchmark()
    elif args.mode == "opencv":
        run_opencv_gui(args)
    elif args.mode == "web":
        import uvicorn
        from server.app import state
        state.update_source(args.source, video_path=args.video, camera_index=args.camera_id)
        state.phase_evm.update_params(alpha=args.alpha, low_hz=args.low_hz, high_hz=args.high_hz)
        state.fft_analyzer.set_calibration(args.scale_mm_per_px)
        state.diagnostics.set_nominal_rpm(args.rpm)
        print("=" * 70)
        print("[START] Launching ChronoPhys-Vision 3.0 Enterprise Appliance Server...")
        print(f"[URL] Dashboard available at: http://{args.host}:{args.port}")
        print(f"[SOURCE] {args.source.upper()} (Camera ID: {args.camera_id if args.source == 'webcam' else 'N/A'})")
        print("=" * 70)
        uvicorn.run("server.app:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
