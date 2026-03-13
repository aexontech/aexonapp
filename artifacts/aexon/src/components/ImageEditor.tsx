import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Arrow, Circle, Rect, Transformer } from 'react-konva';
import { X, ArrowUpRight, Circle as CircleIcon, Square, Trash2, Check, Undo } from 'lucide-react';
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

export default function ImageEditor({ imageUrl, initialShapes = [], onSave, onClose }: ImageEditorProps) {
  const [image] = useImage(imageUrl, 'anonymous');
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'arrow' | 'circle' | 'rect' | 'select'>('select');
  const [color, setColor] = useState('#ef4444'); // Default red
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
    
    // If clicked on a shape (not empty and not image), select it
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

    // Start drawing a new shape
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
      // Clear selection to hide transformer before capture
      setSelectedId(null);
      
      // Use a small timeout to ensure the transformer is hidden in the next render cycle
      setTimeout(() => {
        const dataUrl = stageRef.current.toDataURL();
        onSave(dataUrl, shapes);
      }, 50);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white text-slate-900">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">Edit Foto</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 mr-4">
            <button
              onClick={() => setTool('select')}
              className={`p-2 rounded-lg transition-all ${tool === 'select' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              title="Pilih"
            >
              <ArrowUpRight className="w-5 h-5 rotate-[-45deg]" />
            </button>
            <button
              onClick={() => setTool('arrow')}
              className={`p-2 rounded-lg transition-all ${tool === 'arrow' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              title="Panah"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool('circle')}
              className={`p-2 rounded-lg transition-all ${tool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              title="Lingkaran"
            >
              <CircleIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool('rect')}
              className={`p-2 rounded-lg transition-all ${tool === 'rect' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              title="Persegi"
            >
              <Square className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 mr-4">
            {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#000000'].map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-blue-600 scale-110' : 'border-slate-200'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleUndo} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors" title="Undo">
              <Undo className="w-5 h-5" />
            </button>
            <button onClick={handleDelete} className="p-2 hover:bg-slate-100 rounded-lg text-red-500 hover:text-red-600 transition-colors" title="Hapus">
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              className="ml-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <Check className="w-4 h-4" />
              Simpan
            </button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div ref={containerRef} className="flex-1 relative bg-slate-50 overflow-hidden flex items-center justify-center">
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
                      points={shape.points}
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
                    // limit resize
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
    </div>
  );
}
