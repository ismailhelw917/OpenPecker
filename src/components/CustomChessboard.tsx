import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { DndContext, DragOverlay, useDraggable, useDroppable, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'motion/react';

interface CustomChessboardProps {
  game: any;
  orientation?: 'white' | 'black';
  onSquareClick?: (square: string) => void;
  onPieceDrop?: (sourceSquare: string, targetSquare: string) => boolean | Promise<boolean>;
  boardColors?: { light: string; dark: string };
  optionSquares?: Record<string, any>;
  lastMove?: { from: string; to: string } | null;
  legalMoves?: string[];
  captureSquare?: string | null;
}

const DraggablePiece = ({ piece, squareName }: { piece: any; squareName: string }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: squareName,
    data: { piece, squareName },
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <img
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      draggable="false"
      src={`https://lichess1.org/assets/piece/cburnett/${piece.color}${piece.type.toUpperCase()}.svg`}
      alt={`${piece.color}${piece.type}`}
      className={`w-full h-full p-1 cursor-grab transition-none relative z-10 ${isDragging ? 'opacity-0' : 'opacity-100'}`}
      style={{ ...style, touchAction: 'none' }}
      onClick={(e) => e.stopPropagation()}
      referrerPolicy="no-referrer"
    />
  );
};

const DroppableSquare = ({ squareName, isDark, children, onDrop, boardColors }: { squareName: string; isDark: boolean; children: React.ReactNode; onDrop: (target: string) => void, boardColors: { light: string; dark: string } }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: squareName,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex items-center justify-center ${isOver ? 'ring-2 ring-yellow-400' : ''}`}
      style={{ backgroundColor: isDark ? boardColors.dark : boardColors.light }}
      onClick={() => onDrop(squareName)}
    >
      {children}
      <span className="absolute bottom-0 right-0 text-[8px] text-black/30">{squareName}</span>
    </div>
  );
};

export const CustomChessboard: React.FC<CustomChessboardProps> = ({
  game,
  orientation = 'white',
  onSquareClick,
  onPieceDrop,
  boardColors = { light: '#f0d9b5', dark: '#b58863' },
  optionSquares = {},
  legalMoves: propLegalMoves,
  captureSquare,
}) => {
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );
  const board = useMemo(() => game.board(), [game]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [activePiece, setActivePiece] = useState<any | null>(null);
  const [activeSquare, setActiveSquare] = useState<string | null>(null);

  const squares = useMemo(() => {
    const result = [];
    if (orientation === 'black') {
      for (let r = 7; r >= 0; r--) {
        for (let c = 7; c >= 0; c--) {
          result.push({ r, c });
        }
      }
    } else {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          result.push({ r, c });
        }
      }
    }
    return result;
  }, [orientation]);

  const getSquareName = (r: number, c: number) => {
    return `${String.fromCharCode(97 + c)}${8 - r}`;
  };

  const legalMoves = useMemo(() => {
    if (propLegalMoves) return propLegalMoves;
    const source = selectedSquare || activeSquare;
    if (!source) return [];
    return game.moves({ square: source as any, verbose: true }).map((m: any) => m.to);
  }, [game, selectedSquare, activeSquare, propLegalMoves]);

  const handleSquareClick = (squareName: string) => {
    const piece = game.get(squareName as any);
    
    if (selectedSquare) {
      const moves = game.moves({ square: selectedSquare as any, verbose: true });
      const move = moves.find((m: any) => m.to === squareName);
      
      if (move) {
        onPieceDrop?.(selectedSquare, squareName);
        setSelectedSquare(null);
      } else {
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(squareName);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(squareName);
      }
    }
  };

  const handleDragStart = (event: any) => {
    console.log('Drag start:', event);
    setActivePiece(event.active.data.current.piece);
    setActiveSquare(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    setActivePiece(null);
    setActiveSquare(null);
    const { active, over } = event;
    console.log('Drag end details:', { 
      activeId: active?.id, 
      overId: over?.id,
      orientation,
      squares: squares.map(s => getSquareName(s.r, s.c))
    });
    if (over && active.id !== over.id) {
      const result = await onPieceDrop?.(active.id, over.id);
      return result || false;
    }
    return false;
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-8 grid-rows-8 w-full aspect-square border border-border-dark/50 overflow-hidden">
        {squares.map(({ r, c }) => {
          const squareName = getSquareName(r, c);
          const piece = board[r][c];
          const isDark = (r + c) % 2 !== 0;

          return (
            <DroppableSquare key={squareName} squareName={squareName} isDark={isDark} onDrop={handleSquareClick} boardColors={boardColors}>
              <AnimatePresence>
                {captureSquare === squareName && (
                  <motion.div
                    key="capture-effect"
                    initial={{ scale: 0.2, opacity: 0.8 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute inset-0 bg-red-500 rounded-full z-0 pointer-events-none"
                  />
                )}
              </AnimatePresence>
              {piece && <DraggablePiece piece={piece} squareName={squareName} />}
              {optionSquares[squareName] && <div className="absolute inset-0" style={optionSquares[squareName]} />}
              {selectedSquare === squareName && <div className="absolute inset-0 bg-yellow-400/50" />}
              {activeSquare === squareName && <div className="absolute inset-0 bg-yellow-400/50" />}
              {legalMoves.includes(squareName) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-4 h-4 rounded-full ${piece ? 'bg-red-500/50' : 'bg-black/20'}`} />
                </div>
              )}
            </DroppableSquare>
          );
        })}
      </div>
      <DragOverlay>
        {activePiece ? (
          <img
            src={`https://lichess1.org/assets/piece/cburnett/${activePiece.color}${activePiece.type.toUpperCase()}.svg`}
            alt={`${activePiece.color}${activePiece.type}`}
            className="w-full h-full p-1 cursor-grabbing transition-none"
            draggable="false"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
