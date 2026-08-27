"""
ChronoPhys-Vision 3.0: Ultra-Smooth Asynchronous & Non-Blocking Server
Architecture:
- Dedicated Background Capture & Processing Daemon Thread (Zero Webcam Lag)
- Frame-Dropping Queue (maxsize=1) for Real-Time Throughput
- Non-Blocking WebSocket Broadcast Loop with Pre-Encoded Base64 JPEGs (640x360 @ 30 FPS)
- Exception Isolation around all AI Assistant, Fault Injection, and DSP calls
"""

import asyncio
import base64
import io
import json
import os
import time
import threading
import queue
from typing import Optional, Dict, Any, List
from datetime import datetime

import cv2
import numpy as np

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.phase_evm import PhaseBasedVideoMagnifier
from core.evm import SyntheticVibrationGenerator
from core.fft_analyzer import SubPixelFFTAnalyzer
from core.multi_tracker import MultiROITracker
from core.auto_detector import AutoMachineDetector
from core.ar_overlay import ARStressHeatmapOverlay
from core.hardware_trip import HardwareTripEngine, SmartRelayType
from core.agent_loop import IndustrialAgentController
from core.diagnostics import IndustrialDiagnosticsEngine, MachineGroup, ISOZone
from core.industrial_io import ModbusTCPAdapter, MQTTTelemetryPublisher
from core.pinn_fatigue import PINNFatigueEngine
from core.ods_digital_twin import ODSDigitalTwinEngine
from core.motion_engine import MotionProcessingEngine
from core.stabilizer import OpticalStabilizerAndFlickerFilter
from core.analytics import ModalCoherenceAndWaterfallEngine
from core.fault_injector import FaultInjectionEngine, FaultPreset
from server.roi_calculator import EnterpriseROICalculator
from server.assistant import MaintenanceAIAssistant
from server.mcp_agent import MCPAgentServer
from server.recorder import DemoRecordingEngine
from server.report_generator import generate_engineering_pdf
from server.database import TelemetryDatabase

app = FastAPI(title="ChronoPhys-Vision 3.0 Enterprise Appliance", version="3.0.0")
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PipelineState:
    def __init__(self):
        self.fps = 30.0
        self.target_width = 640
        self.target_height = 360
        self.source_mode = "synthetic"
        self.video_path: Optional[str] = None
        self.camera_index: int = 0
        self.show_ar_heatmap: bool = False
        self.auto_lock_enabled: bool = True

        # Core Engines
        self.phase_evm = PhaseBasedVideoMagnifier(fps=self.fps, low_hz=1.0, high_hz=6.0, alpha=50.0, engine_mode="PHASE")
        self.fft_analyzer = SubPixelFFTAnalyzer(fps=self.fps, buffer_size=128, scale_mm_per_pixel=0.05)
        self.multi_tracker = MultiROITracker(fps=self.fps, buffer_size=128, scale_mm_per_pixel=0.05)
        self.auto_detector = AutoMachineDetector()
        self.ar_overlay = ARStressHeatmapOverlay(grid_step=16, alpha_blend=0.45)
        self.hardware_trip = HardwareTripEngine(relay_type=SmartRelayType.SIMULATED)
        self.diagnostics = IndustrialDiagnosticsEngine(machine_group=MachineGroup.GROUP_2_RIGID, nominal_rpm=1800.0)
        self.agent = IndustrialAgentController(critical_resonance_band=(3.0, 4.5), max_allowable_vrms_mms=2.8)
        self.pinn_fatigue = PINNFatigueEngine()
        self.ods_twin = ODSDigitalTwinEngine(fps=self.fps)
        self.modbus = ModbusTCPAdapter()
        self.mqtt = MQTTTelemetryPublisher()
        self.assistant = MaintenanceAIAssistant()
        self.recorder = DemoRecordingEngine()
        self.fault_injector = FaultInjectionEngine()
        self.roi_calculator = EnterpriseROICalculator(hourly_downtime_rate=3500.0)
        self.stabilizer = OpticalStabilizerAndFlickerFilter(fps=self.fps)
        self.analytics = ModalCoherenceAndWaterfallEngine(fps=self.fps)
        self.db = TelemetryDatabase()

        self.motion_engine = MotionProcessingEngine(
            phase_evm=self.phase_evm,
            fft_analyzer=self.fft_analyzer,
            multi_tracker=self.multi_tracker,
            auto_detector=self.auto_detector,
            ar_overlay=self.ar_overlay,
            stabilizer=self.stabilizer,
            analytics=self.analytics,
            target_width=self.target_width,
            target_height=self.target_height
        )

        self.synthetic_gen = SyntheticVibrationGenerator(
            width=self.target_width, height=self.target_height, fps=self.fps, target_frequency_hz=3.5, displacement_amplitude_px=0.6
        )

        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = True

        # Threading buffers
        self.raw_frame_queue = queue.Queue(maxsize=1)
        self.latest_raw_base64: str = ""
        self.latest_mag_base64: str = ""
        self.latest_telemetry: Dict[str, Any] = {}
        self.clients = set()
        self._lock = threading.Lock()

    def update_source(self, mode: str, video_path: Optional[str] = None, camera_index: int = 0):
        with self._lock:
            self.source_mode = mode
            self.video_path = video_path
            self.camera_index = camera_index
            if self.cap is not None:
                self.cap.release()
                self.cap = None

            if mode == "webcam":
                self.cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_ANY)
                if self.cap.isOpened():
                    self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)
                    self.cap.set(cv2.CAP_PROP_FPS, 30)
            elif mode == "file" and video_path and os.path.exists(video_path):
                self.cap = cv2.VideoCapture(video_path)


state = PipelineState()
mcp_agent = MCPAgentServer(state)
UI_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ui")


class ConfigUpdate(BaseModel):
    alpha: Optional[float] = None
    low_hz: Optional[float] = None
    high_hz: Optional[float] = None
    engine_mode: Optional[str] = None
    roi_x: Optional[int] = None
    roi_y: Optional[int] = None
    roi_w: Optional[int] = None
    roi_h: Optional[int] = None
    calibration_mm_per_px: Optional[float] = None
    nominal_rpm: Optional[float] = None
    show_ar_heatmap: Optional[bool] = None
    auto_lock_enabled: Optional[bool] = None
    synthetic_freq: Optional[float] = None
    synthetic_amp: Optional[float] = None


class RecordRequest(BaseModel):
    duration: float = 30.0


class MCPToolCall(BaseModel):
    tool_name: str
    arguments: Optional[Dict[str, Any]] = None


class ChatQuery(BaseModel):
    query: str
    api_key: Optional[str] = None


class FaultSimulateRequest(BaseModel):
    preset: str


class HardwareTripAction(BaseModel):
    action: str
    reason: Optional[str] = "Manual User Command"


def webcam_capture_worker():
    """High-speed camera reader pushing latest frame to non-blocking single-slot queue."""
    while state.is_running:
        raw_frame = None
        try:
            if state.source_mode == "synthetic":
                raw_frame = state.synthetic_gen.get_next_frame()
            elif state.cap is not None and state.cap.isOpened():
                ret, f = state.cap.read()
                if ret:
                    raw_frame = f
                else:
                    if state.video_path:
                        state.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    else:
                        raw_frame = state.synthetic_gen.get_next_frame()
            else:
                raw_frame = state.synthetic_gen.get_next_frame()

            if raw_frame is not None:
                try:
                    state.raw_frame_queue.put_nowait(raw_frame)
                except queue.Full:
                    try:
                        state.raw_frame_queue.get_nowait()
                        state.raw_frame_queue.put_nowait(raw_frame)
                    except Exception:
                        pass
        except Exception:
            pass
        time.sleep(0.005)


def background_pipeline_worker():
    """Non-blocking DSP and ROI-only EVM worker."""
    while state.is_running:
        start_t = time.time()
        try:
            raw_frame = state.raw_frame_queue.get_nowait()
        except queue.Empty:
            raw_frame = None

        if raw_frame is not None:
            try:
                annotated_raw, mag_frame, fft_data, multi_roi_data, coherence_data, calib_info = state.motion_engine.process_frame(
                    raw_frame=raw_frame,
                    auto_lock_enabled=state.auto_lock_enabled,
                    show_ar_heatmap=state.show_ar_heatmap
                )

                dom_freq = fft_data.get("dominant_frequency_hz", 3.5)
                disp_peak_mm = fft_data.get("displacement_peak_mm", 0.001)
                fatigue_data = state.pinn_fatigue.evaluate_cycle_damage(disp_peak_mm, dom_freq, dt_seconds=1.0/state.fps)
                ods_data = state.ods_twin.compute_3d_deflection(multi_roi_data, dom_freq)

                v_rms = fft_data.get("vibration_velocity_rms_mms", 0.0)
                iso_eval = state.diagnostics.evaluate_iso_severity(v_rms)
                faults = state.diagnostics.diagnose_faults(fft_data)
                plc_cmd = state.agent.evaluate_telemetry(fft_data, iso_eval)

                zone_idx = 0 if iso_eval["iso_zone"] == "ZONE_A" else (1 if iso_eval["iso_zone"] == "ZONE_B" else (2 if iso_eval["iso_zone"] == "ZONE_C" else 3))
                state.modbus.update_telemetry(v_rms, zone_idx, plc_cmd["plc_register_40001_throttle"])

                spec_obj = fft_data.get("spectrum", {})
                state.analytics.update_waterfall_buffer(spec_obj.get("frequencies", []), spec_obj.get("power_spectral_density", []))

                # Turbo JPEG Encoding (Quality=65)
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 65]
                _, raw_buf = cv2.imencode('.jpg', annotated_raw, encode_param)
                _, mag_buf = cv2.imencode('.jpg', mag_frame, encode_param)

                raw_b64 = "data:image/jpeg;base64," + base64.b64encode(raw_buf).decode('ascii')
                mag_b64 = "data:image/jpeg;base64," + base64.b64encode(mag_buf).decode('ascii')

                raw_telem = {
                    "fft": fft_data,
                    "iso": iso_eval,
                    "faults": faults,
                    "multi_roi": multi_roi_data,
                    "pinn_fatigue": fatigue_data,
                    "ods_digital_twin": ods_data,
                    "coherence": coherence_data,
                    "calibration": calib_info,
                    "stabilizer": state.stabilizer.get_telemetry_status(),
                    "waterfall": state.analytics.get_waterfall_payload(),
                    "hardware_trip": state.hardware_trip.get_status(),
                    "plc": plc_cmd,
                    "modbus": state.modbus.get_status_payload(),
                    "config": {
                        "alpha": state.phase_evm.alpha,
                        "low_hz": state.phase_evm.low_hz,
                        "high_hz": state.phase_evm.high_hz,
                        "engine_mode": state.phase_evm.engine_mode,
                        "auto_lock_enabled": state.auto_lock_enabled,
                        "calibration_mm_per_px": state.fft_analyzer.scale_mm,
                        "nominal_rpm": state.diagnostics.nominal_rpm,
                        "show_ar_heatmap": state.show_ar_heatmap,
                        "source_mode": state.source_mode,
                        "synthetic_freq": state.synthetic_gen.freq
                    }
                }

                mod_telem = state.fault_injector.modulate_telemetry(raw_telem, state.diagnostics.nominal_rpm)
                roi_metrics = state.roi_calculator.compute_roi(mod_telem)
                mod_telem["roi"] = roi_metrics
                mod_telem["fault_injector"] = {
                    "active_preset": state.fault_injector.active_preset.value,
                    "description": state.fault_injector.get_preset_description(state.fault_injector.active_preset)
                }

                with state._lock:
                    state.latest_raw_base64 = raw_b64
                    state.latest_mag_base64 = mag_b64
                    state.latest_telemetry = mod_telem

                # Log periodic time-series to database (10 Hz / 1s throttle)
                state.db.log_snapshot(state.latest_telemetry, min_interval_sec=1.0)

                if state.recorder.is_recording:
                    state.recorder.write_frame(annotated_raw, mag_frame, state.latest_telemetry)

            except Exception:
                pass

        elapsed = time.time() - start_t
        sleep_dur = max(0.001, (1.0 / state.fps) - elapsed)
        time.sleep(sleep_dur)


@app.on_event("startup")
async def on_startup():
    t1 = threading.Thread(target=webcam_capture_worker, daemon=True)
    t2 = threading.Thread(target=background_pipeline_worker, daemon=True)
    t1.start()
    t2.start()


@app.on_event("shutdown")
async def on_shutdown():
    state.is_running = False
    if state.cap is not None:
        state.cap.release()


@app.get("/", response_class=HTMLResponse)
async def get_index():
    index_file = os.path.join(UI_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>ChronoPhys-Vision 3.0 UI Initializing...</h1>")


import logging

# Structured JSON Logger
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.now().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        }
        if hasattr(record, "metadata"):
            log_obj["metadata"] = record.metadata
        return json.dumps(log_obj)

logger = logging.getLogger("chronophys.audit")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(JsonFormatter())
    logger.addHandler(ch)

server_start_time = time.time()
AUTH_API_KEY = os.getenv("CHRONOPHYS_API_KEY", "")


@app.get("/healthz")
async def healthz():
    """Liveness probe endpoint."""
    return JSONResponse(content={
        "status": "HEALTHY",
        "service": "ChronoPhys-Vision 3.0 Optical Telemetry Engine",
        "uptime_sec": round(time.time() - server_start_time, 2),
        "timestamp": datetime.now().isoformat()
    })


@app.get("/readyz")
async def readyz():
    """Readiness probe endpoint."""
    with state._lock:
        has_telem = bool(state.latest_telemetry)
        feed_ready = bool(state.latest_raw_base64)
    return JSONResponse(content={
        "status": "READY" if (state.is_running and has_telem) else "INITIALIZING",
        "camera_feed": "ONLINE" if feed_ready else "STANDBY",
        "dsp_pipeline": "PHASE_EVM_ACTIVE",
        "source_mode": state.source_mode,
        "clients_connected": len(state.clients),
        "timestamp": datetime.now().isoformat()
    })


@app.get("/api/status")
async def get_status():
    with state._lock:
        return JSONResponse(content={
            "source_mode": state.source_mode,
            "fps": state.fps,
            "engine_mode": state.phase_evm.engine_mode,
            "alpha": state.phase_evm.alpha,
            "active_preset": state.fault_injector.active_preset.value,
            "status": "ONLINE"
        })


@app.post("/api/config")
async def update_configuration(cfg: ConfigUpdate):
    with state._lock:
        if cfg.alpha is not None:
            state.phase_evm.alpha = float(cfg.alpha)
        if cfg.low_hz is not None and cfg.high_hz is not None:
            state.phase_evm.update_bandpass(float(cfg.low_hz), float(cfg.high_hz))
        if cfg.engine_mode is not None:
            state.phase_evm.engine_mode = str(cfg.engine_mode).upper()
        if cfg.roi_x is not None and cfg.roi_w is not None:
            state.fft_analyzer.set_roi(cfg.roi_x, cfg.roi_y, cfg.roi_w, cfg.roi_h)
        if cfg.calibration_mm_per_px is not None:
            state.fft_analyzer.scale_mm = float(cfg.calibration_mm_per_px)
            state.multi_tracker.scale_mm = float(cfg.calibration_mm_per_px)
        if cfg.nominal_rpm is not None:
            state.diagnostics.nominal_rpm = float(cfg.nominal_rpm)
        if cfg.show_ar_heatmap is not None:
            state.show_ar_heatmap = bool(cfg.show_ar_heatmap)
        if cfg.auto_lock_enabled is not None:
            state.auto_lock_enabled = bool(cfg.auto_lock_enabled)
        if cfg.synthetic_freq is not None:
            state.synthetic_gen.freq = float(cfg.synthetic_freq)
        if cfg.synthetic_amp is not None:
            state.synthetic_gen.amp = float(cfg.synthetic_amp)

    return JSONResponse(content={"status": "success", "message": "Configuration updated"})


@app.post("/api/fault/simulate")
async def simulate_fault(req: FaultSimulateRequest):
    res = state.fault_injector.set_preset(req.preset)
    state.fault_injector.configure_synthetic_generator(state.synthetic_gen, state.diagnostics.nominal_rpm)
    return JSONResponse(content=res)


@app.post("/api/demo/record")
async def start_demo_record(req: RecordRequest):
    res = state.recorder.start_recording(duration_sec=req.duration, fps=state.fps)
    return JSONResponse(content=res)


@app.get("/api/demo/status")
async def get_demo_status():
    return JSONResponse(content=state.recorder.get_status())


@app.get("/api/demo/download")
async def download_demo_video():
    filepath = state.recorder.canonical_filename
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="video/mp4", filename="chronophys_30s_competition_demo.mp4")
    return JSONResponse(content={"error": "No 30-second recording available yet. Please click 'Record 30s Demo' first."}, status_code=404)


@app.get("/api/telemetry/history")
async def get_telemetry_history(hours: float = 168.0, limit: int = 150):
    history_records = state.db.get_history(hours=hours, limit=limit)
    return JSONResponse(content={"count": len(history_records), "history": history_records})


@app.get("/api/mcp/tools")
async def get_mcp_tools():
    return JSONResponse(content={"tools": mcp_agent.get_tool_definitions()})


@app.post("/api/mcp/execute")
async def execute_mcp_tool(call: MCPToolCall):
    res = await mcp_agent.execute_tool(call.tool_name, call.arguments or {})
    return JSONResponse(content=res)


@app.post("/api/mcp/auto_calibrate")
async def trigger_auto_calibrate():
    res = mcp_agent.run_auto_calibration()
    return JSONResponse(content=res)


@app.post("/api/assistant/chat")
async def assistant_chat(req: ChatQuery):
    try:
        answer = state.assistant.generate_response(req.query, state.latest_telemetry, api_key=req.api_key)
        return JSONResponse(content={"response": answer, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return JSONResponse(content={"response": f"⚠️ Assistant query failed: {str(e)}", "timestamp": datetime.now().isoformat()})


@app.post("/api/hardware/trip")
async def trigger_hardware_trip(action: HardwareTripAction):
    if action.action.upper() == "TRIP":
        res = await state.hardware_trip.trigger_emergency_cut_off(reason=action.reason or "Manual Override")
    else:
        res = state.hardware_trip.reset_trip()
    return JSONResponse(content=res)


@app.get("/api/telemetry")
async def get_latest_telemetry():
    with state._lock:
        return JSONResponse(content=state.latest_telemetry or {})


@app.post("/api/record_demo")
async def api_record_demo(req: Optional[RecordRequest] = None):
    duration = req.duration if req else 30.0
    res = state.recorder.start_recording(duration_sec=duration, fps=state.fps)
    return JSONResponse(content=res)


@app.get("/api/generate_pdf")
async def api_generate_pdf():
    return await generate_pdf_report()


def mjpeg_generator(feed_type: str = "raw"):
    """Yields continuous multipart MJPEG stream for <img> tag embedding."""
    while state.is_running:
        with state._lock:
            b64_str = state.latest_raw_base64 if feed_type == "raw" else state.latest_mag_base64

        if b64_str and "," in b64_str:
            try:
                jpg_bytes = base64.b64decode(b64_str.split(",")[1])
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpg_bytes + b'\r\n')
            except Exception:
                pass
        time.sleep(1.0 / 30.0)


@app.get("/video_feed_raw")
async def video_feed_raw():
    return StreamingResponse(
        mjpeg_generator("raw"),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/video_feed_phase")
async def video_feed_phase():
    return StreamingResponse(
        mjpeg_generator("phase"),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/api/report/generate")
async def generate_pdf_report():
    with state._lock:
        telem = dict(state.latest_telemetry)

    pdf_bytes = generate_engineering_pdf(
        telemetry=telem,
        nominal_rpm=state.diagnostics.nominal_rpm,
        scale_mm=state.fft_analyzer.scale_mm
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=chronophys_audit_report.pdf"}
    )


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    state.clients.add(websocket)

    try:
        while True:
            try:
                msg_text = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                msg = json.loads(msg_text)
                if msg.get("type") == "set_config":
                    if "alpha" in msg: state.phase_evm.alpha = float(msg["alpha"])
                    if "low_hz" in msg and "high_hz" in msg: state.phase_evm.update_bandpass(float(msg["low_hz"]), float(msg["high_hz"]))
                    if "engine_mode" in msg: state.phase_evm.engine_mode = str(msg["engine_mode"]).upper()
                    if "auto_lock_enabled" in msg: state.auto_lock_enabled = bool(msg["auto_lock_enabled"])
                    if "show_ar_heatmap" in msg: state.show_ar_heatmap = bool(msg["show_ar_heatmap"])
                    if "calibration_mm_per_px" in msg:
                        state.fft_analyzer.scale_mm = float(msg["calibration_mm_per_px"])
                        state.multi_tracker.scale_mm = float(msg["calibration_mm_per_px"])
                    if "nominal_rpm" in msg: state.diagnostics.nominal_rpm = float(msg["nominal_rpm"])
            except (asyncio.TimeoutError, json.JSONDecodeError):
                pass

            with state._lock:
                r_b64 = state.latest_raw_base64
                m_b64 = state.latest_mag_base64
                telem = state.latest_telemetry

            if r_b64 and m_b64:
                payload = {
                    "raw_frame": r_b64,
                    "mag_frame": m_b64,
                    "telemetry": telem,
                    "timestamp": time.time()
                }
                await websocket.send_text(json.dumps(payload))

            await asyncio.sleep(1.0 / 30.0)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        state.clients.discard(websocket)
