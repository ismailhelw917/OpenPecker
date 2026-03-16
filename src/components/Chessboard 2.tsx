import React, { useMemo, useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';

interface ChessboardProps {
  position: string;
  boardOrientation: 'white' | 'black';
  onPieceDrop: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
  customDarkSquareStyle?: React.CSSProperties;
  customLightSquareStyle?: React.CSSProperties;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  position,
  boardOrientation,
  onPieceDrop,
  customDarkSquareStyle,
  customLightSquareStyle,
}) => {
  const game = useMemo(() => new Chess(position), [position]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSquare(null);
  }, [position]);

  const board = useMemo(() => {
    const b = game.board();
    return boardOrientation === 'white' ? b : b.slice().reverse().map(row => row.slice().reverse());
  }, [game, boardOrientation]);

  const squares = useMemo(() => {
    const s = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const file = boardOrientation === 'white' ? String.fromCharCode(97 + j) : String.fromCharCode(97 + (7 - j));
        const rank = boardOrientation === 'white' ? (8 - i) : (i + 1);
        s.push(`${file}${rank}`);
      }
    }
    return s;
  }, [boardOrientation]);

  const handleSquareClick = (square: string) => {
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
      } else {
        const success = onPieceDrop(selectedSquare, square, '');
        if (success) {
          setSelectedSquare(null);
        } else {
          // If move failed, check if clicked square has a piece of same color
          const piece = game.get(square as any);
          if (piece && piece.color === game.get(selectedSquare as any)?.color) {
            setSelectedSquare(square);
          } else {
            setSelectedSquare(null);
          }
        }
      }
    } else {
      const piece = game.get(square as any);
      if (piece) {
        setSelectedSquare(square);
      }
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    onPieceDrop(active.id, over.id, '');
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-8 w-full h-full">
        {squares.map((square, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isDark = (row + col) % 2 !== 0;
          const piece = board[row][col];
          const isSelected = selectedSquare === square;
          
          return (
            <DroppableSquare 
              key={square} 
              id={square} 
              onClick={() => handleSquareClick(square)}
              style={{
                ...(isDark ? customDarkSquareStyle : customLightSquareStyle),
                ...(isSelected ? { backgroundColor: 'rgba(255, 255, 0, 0.5)' } : {}),
              }}
            >
              {piece && <DraggablePiece id={square} piece={piece} />}
            </DroppableSquare>
          );
        })}
      </div>
    </DndContext>
  );
};

const DroppableSquare = ({ id, children, style, onClick }: { id: string, children: React.ReactNode, style?: React.CSSProperties, onClick: () => void }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} onClick={onClick} className="w-full h-full flex items-center justify-center cursor-pointer" style={style}>
      {children}
    </div>
  );
};

const DraggablePiece = ({ id, piece }: { id: string, piece: any }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const pieceType = `${piece.color}${piece.type.toUpperCase()}`;
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="cursor-grab">
      <img
        src={`https://lichess1.org/assets/piece/cburnett/${pieceType}.svg`}
        alt={pieceType}
        className="w-full h-full"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
