import React, { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";

export default function PatternLock({ value, onChange, disabled = false }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pattern, setPattern] = useState([]);
  const [dots] = useState([
    { id: 1, x: 75, y: 75 },
    { id: 2, x: 150, y: 75 },
    { id: 3, x: 225, y: 75 },
    { id: 4, x: 75, y: 150 },
    { id: 5, x: 150, y: 150 },
    { id: 6, x: 225, y: 150 },
    { id: 7, x: 75, y: 225 },
    { id: 8, x: 150, y: 225 },
    { id: 9, x: 225, y: 225 }
  ]);

  useEffect(() => {
    drawPattern();
  }, [pattern]);

  useEffect(() => {
    if (value && value !== pattern.join('-')) {
      const savedPattern = value.split('-').map(Number).filter(n => !isNaN(n));
      setPattern(savedPattern);
    }
  }, []);

  const drawPattern = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 300);

    // Desenhar dots
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 15, 0, 2 * Math.PI);
      ctx.fillStyle = pattern.includes(dot.id) ? '#3b82f6' : '#cbd5e1';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Número do dot
      ctx.fillStyle = pattern.includes(dot.id) ? '#ffffff' : '#64748b';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dot.id, dot.x, dot.y);
    });

    // Desenhar linhas do padrão
    if (pattern.length > 1) {
      ctx.beginPath();
      const firstDot = dots.find(d => d.id === pattern[0]);
      ctx.moveTo(firstDot.x, firstDot.y);

      for (let i = 1; i < pattern.length; i++) {
        const dot = dots.find(d => d.id === pattern[i]);
        ctx.lineTo(dot.x, dot.y);
      }

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const getClickedDot = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return dots.find(dot => {
      const distance = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
      return distance <= 20;
    });
  };

  const handleMouseDown = (e) => {
    if (disabled) return;
    const dot = getClickedDot(e);
    if (dot && !pattern.includes(dot.id)) {
      setIsDrawing(true);
      const newPattern = [dot.id];
      setPattern(newPattern);
      onChange(newPattern.join('-'));
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || disabled) return;
    const dot = getClickedDot(e);
    if (dot && !pattern.includes(dot.id)) {
      const newPattern = [...pattern, dot.id];
      setPattern(newPattern);
      onChange(newPattern.join('-'));
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    setPattern([]);
    onChange('');
  };

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="border-2 border-slate-200 rounded-lg cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </Card>
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Padrão: <span className="font-mono font-semibold">{pattern.join('-') || 'Nenhum'}</span>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Limpar
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Desenhe o padrão de desbloqueio conectando os pontos na ordem correta
      </p>
    </div>
  );
}