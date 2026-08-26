"use client";

import React, { useEffect, useRef } from 'react';
import { Box, Layers, RotateCw, Activity } from 'lucide-react';

interface Ods3dWireframeProps {
  faultMode: 'normal' | 'bearing_fault' | 'unbalance' | 'misalignment';
  vRms: number;
  shaftRpm: number;
}

export const Ods3dWireframe: React.FC<Ods3dWireframeProps> = ({ faultMode, vRms, shaftRpm }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let time = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      time += 0.05;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#060910';
      ctx.fillRect(0, 0, w, h);

      // Perspective 3D wireframe projection
      const cx = w / 2;
      const cy = h / 2 + 10;
      const numNodes = 12;
      const radius = 26;
      const shaftLength = 200;

      const amp = faultMode === 'bearing_fault' ? 14 : (faultMode === 'unbalance' ? 10 : 3);
      const angle = time * 2;

      // Project 3D point (x, y, z) to 2D
      const project = (x: number, y: number, z: number) => {
        const fov = 240;
        const pz = z + 300;
        const scale = fov / pz;
        return {
          x: cx + x * scale,
          y: cy + y * scale,
          scale
        };
      };

      // Draw 3D Shaft Rings
      ctx.strokeStyle = faultMode === 'bearing_fault' ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 1.2;

      for (let ring = -3; ring <= 3; ring++) {
        const zPos = ring * 35;
        const ringDeflectY = Math.sin(angle + ring * 0.6) * amp;
        const ringDeflectX = Math.cos(angle + ring * 0.6) * (amp * 0.6);

        ctx.beginPath();
        for (let i = 0; i <= numNodes; i++) {
          const theta = (i / numNodes) * Math.PI * 2;
          const px = Math.cos(theta) * radius + ringDeflectX;
          const py = Math.sin(theta) * radius + ringDeflectY;
          const pt = project(px, py, zPos);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // Draw Longitudinal Grid Lines
      for (let i = 0; i < numNodes; i += 2) {
        const theta = (i / numNodes) * Math.PI * 2;
        ctx.beginPath();
        for (let ring = -3; ring <= 3; ring++) {
          const zPos = ring * 35;
          const ringDeflectY = Math.sin(angle + ring * 0.6) * amp;
          const ringDeflectX = Math.cos(angle + ring * 0.6) * (amp * 0.6);
          const px = Math.cos(theta) * radius + ringDeflectX;
          const py = Math.sin(theta) * radius + ringDeflectY;
          const pt = project(px, py, zPos);
          if (ring === -3) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // HUD Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px monospace';
      ctx.fillText('3D ODS MODAL DEFLECTION SHAPE', 10, 16);
      ctx.fillStyle = faultMode === 'bearing_fault' ? '#f43f5e' : '#10b981';
      ctx.fillText(`MODE: ${faultMode === 'bearing_fault' ? '142.5 Hz (TORSIONAL+RADIAL)' : '1X CYCLIC BENDING'}`, 10, 28);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [faultMode]);

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 shadow-lg space-y-2 font-mono text-xs">
      <div className="flex items-center justify-between">
        <span className="text-slate-200 font-bold flex items-center space-x-1.5">
          <Box className="w-3.5 h-3.5 text-mcp-purple" />
          <span>3D ODS Modal Wireframe</span>
        </span>
        <span className="text-[10px] text-slate-400">{shaftRpm} RPM Modal Mesh</span>
      </div>
      <div className="w-full h-32 bg-black rounded-xl overflow-hidden border border-slate-850">
        <canvas ref={canvasRef} width={340} height={128} className="w-full h-full object-cover" />
      </div>
    </div>
  );
};
