import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { Play, Trash2, CheckCircle2, Share2, Plus, RotateCcw } from 'lucide-react';
import { SavedSet } from '../types';

interface SetsScreenProps {
  onGoToTrain: () => void;
  onResume: () => void;
}

export default function SetsScreen({ onGoToTrain, onResume }: SetsScreenProps) {
  const { savedSets, deleteSavedSet, setCurrentPuzzleIndex, setPuzzles } = useChessStore();
  const [setToDelete, setSetToDelete] = useState<string | null>(null);

  const activeSets = savedSets.filter(s => s.status === 'active');
  const completedSets = savedSets.filter(s => s.status === 'completed');

  const handleResume = (set: SavedSet) => {
    console.log('Resuming set:', set.openingDisplay, 'Puzzles:', set.puzzles.length);
    setPuzzles(set.puzzles);
    setCurrentPuzzleIndex(0); // Or resume from where they left off if we tracked it per set
    console.log('Puzzles set in store, calling onResume');
    onResume();
  };

  const handleShare = (set: SavedSet) => {
    const text = `I'm training the ${set.openingDisplay} opening on OpenPecker! I've completed ${set.cyclesCompleted}/${set.targetCycles} cycles with ${set.bestAccuracy}% best accuracy.`;
    if (navigator.share) {
      navigator.share({
        title: 'OpenPecker Training',
        text: text,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Stats copied to clipboard!');
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-dark text-white overflow-y-auto p-6 md:p-10">
      <div className="flex justify-between items-center mb-10">
        <h1 className="font-serif text-4xl font-bold text-text-primary">Your Sets</h1>
        <button 
          onClick={onGoToTrain}
          className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-xl hover:bg-brand-gold hover:text-bg-dark transition-all font-bold text-sm tracking-wider uppercase"
        >
          <Plus size={18} />
          <span>New Set</span>
        </button>
      </div>

      {savedSets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-24 h-24 rounded-full bg-bg-card border border-border-dark flex items-center justify-center mb-6">
            <span className="text-4xl text-text-muted">📚</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">No Sets Yet</h2>
          <p className="text-text-muted mb-8">
            Create a training set to start practicing your openings using spaced repetition.
          </p>
          <button 
            onClick={onGoToTrain}
            className="w-full py-4 bg-brand-gold text-bg-dark rounded-2xl font-bold text-sm tracking-[2px] uppercase shadow-[0_4px_20px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-transform"
          >
            Create First Set
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {activeSets.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></span>
                Active Training
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeSets.map(set => (
                  <SetCard 
                    key={set.id} 
                    set={set} 
                    onResume={() => handleResume(set)}
                    onDelete={() => setSetToDelete(set.id)}
                    onShare={() => handleShare(set)}
                  />
                ))}
              </div>
            </section>
          )}

          {completedSets.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Mastered Sets
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {completedSets.map(set => (
                  <SetCard 
                    key={set.id} 
                    set={set} 
                    onResume={() => handleResume(set)}
                    onDelete={() => setSetToDelete(set.id)}
                    onShare={() => handleShare(set)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {setToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSetToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-bg-card border border-border-dark rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Delete Set?</h3>
              <p className="text-text-muted text-sm mb-8">
                This will permanently remove this training set and its progress. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSetToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-bg-dark border border-border-dark text-text-primary font-bold text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    deleteSavedSet(setToDelete);
                    setSetToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-red-600 transition-colors shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SetCard: React.FC<{ set: SavedSet, onResume: () => void, onDelete: () => void, onShare: () => void }> = ({ set, onResume, onDelete, onShare }) => {
  const isCompleted = set.status === 'completed';
  const progress = (set.cyclesCompleted / set.targetCycles) * 100;

  return (
    <div className={`relative bg-bg-card rounded-2xl p-6 border transition-all hover:shadow-xl group ${
      isCompleted ? 'border-emerald-500/30' : 'border-border-dark hover:border-brand-gold/50'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-text-primary mb-1">{set.openingDisplay}</h3>
          <p className="text-xs text-text-muted font-mono">{set.puzzles.length} Puzzles</p>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onShare} className="p-2 text-text-muted hover:text-brand-gold transition-colors rounded-lg hover:bg-white/5">
            <Share2 size={16} />
          </button>
          <button onClick={onDelete} className="p-2 text-text-muted hover:text-red-500 transition-colors rounded-lg hover:bg-white/5">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
            <span>Cycle Progress</span>
            <span className={isCompleted ? 'text-emerald-500' : 'text-brand-gold'}>
              {set.cyclesCompleted} / {set.targetCycles}
            </span>
          </div>
          <div className="h-1.5 bg-bg-dark rounded-full overflow-hidden">
            <div 
              className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-brand-gold'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-dark rounded-xl p-3 border border-border-dark">
            <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Best Accuracy</p>
            <p className="text-lg font-bold text-text-primary">{set.bestAccuracy}%</p>
          </div>
          <div className="bg-bg-dark rounded-xl p-3 border border-border-dark">
            <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Last Played</p>
            <p className="text-sm font-bold text-text-primary mt-1">
              {new Date(set.lastPlayedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <button 
        onClick={onResume}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
          isCompleted 
            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
            : 'bg-brand-gold text-bg-dark hover:scale-[1.02] shadow-[0_4px_12px_rgba(212,175,55,0.2)]'
        }`}
      >
        {isCompleted ? (
          <>
            <RotateCcw size={16} />
            <span>Practice Again</span>
          </>
        ) : (
          <>
            <Play size={16} className="fill-current" />
            <span>Resume Cycle</span>
          </>
        )}
      </button>
    </div>
  );
}
