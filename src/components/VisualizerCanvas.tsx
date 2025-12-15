import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';


export const VisualizerCanvas = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);

    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        // Initialize fabric canvas
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            backgroundColor: '#161b22',
            selection: false
        });
        fabricRef.current = canvas;

        const drawPipeline = () => {
            canvas.clear();
            canvas.setBackgroundColor('#161b22', () => { });

            const width = canvas.getWidth();
            const height = canvas.getHeight();
            const stageWidth = 100;
            const stageHeight = 100;
            const gap = (width - (stageWidth * 5)) / 6;
            const startY = height / 2 - stageHeight / 2;

            const stages = [
                { name: 'Fetch', color: '#58a6ff' },
                { name: 'Decode', color: '#58a6ff' },
                { name: 'Execute', color: '#d29922' },
                { name: 'Memory', color: '#a371f7' },
                { name: 'WriteBack', color: '#238636' }
            ];

            stages.forEach((stage, i) => {
                const x = gap + (i * (stageWidth + gap));
                const y = startY;

                // Stage Box
                const rect = new fabric.Rect({
                    left: x,
                    top: y,
                    fill: 'rgba(22, 27, 34, 0.8)',
                    stroke: stage.color,
                    strokeWidth: 2,
                    width: stageWidth,
                    height: stageHeight,
                    rx: 5,
                    ry: 5,
                    selectable: false
                });

                // Stage Label
                const text = new fabric.Text(stage.name, {
                    left: x + stageWidth / 2,
                    top: y + stageHeight / 2,
                    fontSize: 14,
                    fill: '#c9d1d9',
                    fontFamily: 'Inter, sans-serif',
                    originX: 'center',
                    originY: 'center',
                    selectable: false
                });

                const group = new fabric.Group([rect, text], {
                    selectable: false,
                    hoverCursor: 'default'
                });

                canvas.add(group);

                // Connectors
                if (i < stages.length - 1) {
                    const nextX = gap + ((i + 1) * (stageWidth + gap));
                    const lineStart = x + stageWidth;
                    const lineEnd = nextX;
                    const midY = y + stageHeight / 2;

                    const line = new fabric.Line([lineStart, midY, lineEnd, midY], {
                        stroke: '#30363d',
                        strokeWidth: 2,
                        selectable: false
                    });

                    // Arrow head
                    const head = new fabric.Triangle({
                        left: lineEnd - 5,
                        top: midY,
                        width: 10,
                        height: 10,
                        fill: '#30363d',
                        angle: 90,
                        originX: 'center',
                        originY: 'center',
                        selectable: false
                    });

                    canvas.add(line, head);
                }
            });
        };

        drawPipeline();

        // Resize Observer to handle window resizing
        const resizeObserver = new ResizeObserver(() => {
            if (!containerRef.current || !fabricRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;

            fabricRef.current.setDimensions({ width: newWidth, height: newHeight });
            drawPipeline();
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            canvas.dispose();
        };
    }, []);

    return (
        <div className="canvas-wrapper" ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <canvas ref={canvasRef} />
        </div>
    );
};
