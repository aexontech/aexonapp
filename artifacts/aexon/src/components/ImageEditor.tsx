import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Arrow, Circle, Rect, Transformer } from 'react-konva';
import { X, ArrowUpRight, Circle as CircleIcon, Square, Trash2, Check, Undo, MousePointer } from 'lucide-react';
import useImage from 'use-image';

interface Shape {
  id: string;
  type: 'arrow' | 'circle' | 'rect';
  points?: number[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

interface ImageEditorProps {
  imageUrl: string;
  initialShapes?: Shape[];
  onSave: (editedImageUrl: string, shapes: Shape[]) => void;
  onClose: () => void;
}

const COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: '#EF4444', label: 'Red' },
  { value: '#F59E0B', label: 'Yellow' },
  { value: '#10B981', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#0C1E35', label: 'Navy' },
];

export default function ImageEditor({ imageUrl, initialShapes = [], onSave, onClose }: ImageEditorProps) {
  const [image] = useImage(imageUrl, 'anonymous');
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'arrow' | 'circle' | 'rect' | 'select'>('select');
  const [color, setColor] = useState('#EF4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, shapes]);

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setStageSize({ width: clientWidth, height: clientHeight });
    }
  }, []);

  useEffect(() => {
    if (selectedId && transformerRef.current && stageRef.current) {
      const node = stageRef.current.findOne('#' + selectedId);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (!selectedId && transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedId, shapes]);

  const handleMouseDown = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    const clickedOnImage = e.target.id() === 'background-image';
    
    if (!clickedOnEmpty && !clickedOnImage) {
      const shapeId = e.target.id();
      if (shapeId) {
        setSelectedId(shapeId);
        setTool('select');
        return;
      }
    }

    if (tool === 'select') {
      if (clickedOnEmpty || clickedOnImage) {
        setSelectedId(null);
      }
      return;
    }

    const pos = e.target.getStage().getPointerPosition();
    const newId = `shape-${Math.random().toString(36).substr(2, 9)}`;
    const newShape: Shape = {
      id: newId,
      type: tool as any,
      x: pos.x,
      y: pos.y,
      color: color,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };

    if (tool === 'arrow') {
      newShape.points = [0, 0, 0, 0];
    } else if (tool === 'circle') {
      newShape.radius = 2;
    } else if (tool === 'rect') {
      newShape.width = 2;
      newShape.height = 2;
    }

    setShapes([...shapes, newShape]);
    setSelectedId(newId);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === 'select' || !selectedId) return;

    const pos = e.target.getStage().getPointerPosition();
    const updatedShapes = shapes.map((shape) => {
      if (shape.id === selectedId) {
        if (shape.type === 'arrow') {
          return { ...shape, points: [0, 0, pos.x - shape.x, pos.y - shape.y] };
        } else if (shape.type === 'circle') {
          const radius = Math.sqrt(
            Math.pow(pos.x - shape.x, 2) + Math.pow(pos.y - shape.y, 2)
          );
          return { ...shape, radius };
        } else if (shape.type === 'rect') {
          return { ...shape, width: pos.x - shape.x, height: pos.y - shape.y };
        }
      }
      return shape;
    });

    setShapes(updatedShapes);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const updatedShapes = shapes.map((shape) => {
      if (shape.id === selectedId) {
        return {
          ...shape,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        };
      }
      return shape;
    });
    setShapes(updatedShapes);
  };

  const handleDragEnd = (e: any) => {
    const node = e.target;
    const updatedShapes = shapes.map((shape) => {
      if (shape.id === selectedId) {
        return {
          ...shape,
          x: node.x(),
          y: node.y(),
        };
      }
      return shape;
    });
    setShapes(updatedShapes);
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (selectedId) {
      setShapes(shapes.map(s => s.id === selectedId ? { ...s, color: newColor } : s));
    }
  };

  const handleDelete = () => {
    if (selectedId) {
      setShapes(shapes.filter((s) => s.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleUndo = () => {
    setShapes(shapes.slice(0, -1));
  };

  const handleSave = () => {
    if (stageRef.current) {
      setSelectedId(null);
      
      setTimeout(() => {
        const dataUrl = stageRef.current.toDataURL();
        onSave(dataUrl, shapes);
      }, 50);
    }
  };

  const tools = [
    { id: 'select' as const, icon: MousePointer, title: 'Pilih' },
    { id: 'arrow' as const, icon: ArrowUpRight, title: 'Panah' },
    { id: 'circle' as const, icon: CircleIcon, title: 'Lingkaran' },
    { id: 'rect' as const, icon: Square, title: 'Persegi' },
  ];

  const toolBtnStyle = (active: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: active ? 'none' : '1px solid #E2E8F0',
    backgroundColor: active ? '#0C1E35' : '#F8FAFC',
    color: active ? '#ffffff' : '#64748B',
    cursor: 'pointer', transition: 'all 150ms',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '90vw', maxHeight: '90vh', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Top Toolbar */}
        <div style={{
          backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0',
          padding: '12px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tools.map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.title}
                style={toolBtnStyle(tool === t.id)}
                onMouseEnter={e => { if (tool !== t.id) { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0C1E35'; }}}
                onMouseLeave={e => { if (tool !== t.id) { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}}
              >
                <t.icon style={{ width: 18, height: 18 }} />
              </button>
            ))}
          </div>

          <span style={{ fontSize: 14, fontWeight: 600, color: '#0C1E35' }}>Anotasi Foto</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleUndo}
              title="Undo"
              style={toolBtnStyle(false)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0C1E35'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}
            >
              <Undo style={{ width: 18, height: 18 }} />
            </button>
            <button
              onClick={handleDelete}
              title="Hapus"
              style={{ ...toolBtnStyle(false), color: '#EF4444' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
            >
              <Trash2 style={{ width: 18, height: 18 }} />
            </button>

            <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0', margin: '0 4px' }} />

            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 10,
                border: '1px solid #E2E8F0', backgroundColor: '#ffffff',
                color: '#64748B', cursor: 'pointer', fontSize: 12,
                fontWeight: 700, transition: 'all 150ms',
                fontFamily: 'Outfit, sans-serif',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10,
                border: 'none', backgroundColor: '#0C1E35',
                color: '#ffffff', cursor: 'pointer', fontSize: 12,
                fontWeight: 700, transition: 'background-color 150ms',
                fontFamily: 'Outfit, sans-serif',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
            >
              <Check style={{ width: 14, height: 14 }} />
              Simpan
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} style={{
          flex: 1, position: 'relative', backgroundColor: '#1a1a2e',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {image && (
            <Stage
              width={stageSize.width}
              height={stageSize.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              ref={stageRef}
            >
              <Layer>
                <KonvaImage
                  id="background-image"
                  image={image}
                  x={(stageSize.width - (image.width * (stageSize.height / image.height))) / 2}
                  y={0}
                  height={stageSize.height}
                  width={image.width * (stageSize.height / image.height)}
                />
                {shapes.map((shape) => {
                  const commonProps = {
                    key: shape.id,
                    id: shape.id,
                    x: shape.x,
                    y: shape.y,
                    rotation: shape.rotation || 0,
                    scaleX: shape.scaleX || 1,
                    scaleY: shape.scaleY || 1,
                    stroke: shape.color,
                    strokeWidth: 4,
                    draggable: tool === 'select',
                    onClick: () => setSelectedId(shape.id),
                    onTap: () => setSelectedId(shape.id),
                    onTransformEnd: handleTransformEnd,
                    onDragEnd: handleDragEnd,
                  };

                  if (shape.type === 'arrow') {
                    return (
                      <Arrow
                        {...commonProps}
                        points={shape.points || [0, 0, 50, 50]}
                        fill={shape.color}
                        pointerLength={10}
                        pointerWidth={10}
                      />
                    );
                  } else if (shape.type === 'circle') {
                    return (
                      <Circle
                        {...commonProps}
                        radius={shape.radius}
                      />
                    );
                  } else if (shape.type === 'rect') {
                    return (
                      <Rect
                        {...commonProps}
                        width={shape.width}
                        height={shape.height}
                      />
                    );
                  }
                  return null;
                })}
                {selectedId && (
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                  />
                )}
              </Layer>
            </Stage>
          )}
        </div>

        {/* Color Palette Bar */}
        <div style={{
          backgroundColor: '#ffffff', borderTop: '1px solid #E2E8F0',
          padding: '12px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, flexShrink: 0,
        }}>
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => handleColorChange(c.value)}
              title={c.label}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                backgroundColor: c.value,
                border: color === c.value ? '2px solid #0C1E35' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 150ms',
                transform: color === c.value ? 'scale(1.15)' : 'scale(1)',
                boxShadow: c.value === '#ffffff' ? 'inset 0 0 0 1px #E2E8F0' : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
