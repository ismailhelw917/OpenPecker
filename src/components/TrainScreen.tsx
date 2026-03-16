import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { Screen } from '../types';
import { Search, Lock, Play, Clock, Target, Repeat, Database, User, Download, CheckCircle2, Home, BarChart2, Settings } from 'lucide-react';
import { ShareButton } from './ShareButton';

const PawnIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2a3 3 0 0 0-3 3 3 3 0 0 0 .39 1.48l-1.89 3.78A2 2 0 0 0 9.29 13h5.42a2 2 0 0 0 1.79-2.74l-1.89-3.78A3 3 0 0 0 15 5a3 3 0 0 0-3-3z" />
    <path d="M9 22h6" />
    <path d="M8 19h8" />
    <path d="M12 13v6" />
  </svg>
);

const OPENINGS = [
  { id: 'mate', name: 'Checkmate', group: 'Tactical Themes', isPremium: true },
  { id: 'fork', name: 'Fork', group: 'Tactical Themes', isPremium: false },
  { id: 'pin', name: 'Pin', group: 'Tactical Themes', isPremium: false },
  { id: 'skewer', name: 'Skewer', group: 'Tactical Themes', isPremium: false },
  { id: 'discoveredAttack', name: 'Discovered Attack', group: 'Tactical Themes', isPremium: false },
  { id: 'sacrifice', name: 'Sacrifice', group: 'Tactical Themes', isPremium: false },
  { id: 'endgame', name: 'Endgame', group: 'Tactical Themes', isPremium: false },
  { id: 'middlegame', name: 'Middlegame', group: 'Tactical Themes', isPremium: false },
  { id: 'opening', name: 'Opening', group: 'Tactical Themes', isPremium: false },
  { id: 'attraction', name: 'Attraction', group: 'Tactical Themes', isPremium: true },
  { id: 'clearance', name: 'Clearance', group: 'Tactical Themes', isPremium: true },
  { id: 'deflection', name: 'Deflection', group: 'Tactical Themes', isPremium: true },
  { id: 'doubleCheck', name: 'Double Check', group: 'Tactical Themes', isPremium: true },
  { id: 'interference', name: 'Interference', group: 'Tactical Themes', isPremium: true },
  { id: 'overloading', name: 'Overloading', group: 'Tactical Themes', isPremium: true },
  { id: 'promotion', name: 'Promotion', group: 'Tactical Themes', isPremium: true },
  { id: 'quietMove', name: 'Quiet Move', group: 'Tactical Themes', isPremium: true },
  { id: 'removeDefense', name: 'Remove Defense', group: 'Tactical Themes', isPremium: true },
  { id: 'trappedPiece', name: 'Trapped Piece', group: 'Tactical Themes', isPremium: true },
  { id: 'underPromotion', name: 'Under-Promotion', group: 'Tactical Themes', isPremium: true },
  { id: 'vulnerableKing', name: 'Vulnerable King', group: 'Tactical Themes', isPremium: true },
  { id: 'xRayAttack', name: 'X-Ray Attack', group: 'Tactical Themes', isPremium: true },
  { id: 'zugzwang', name: 'Zugzwang', group: 'Tactical Themes', isPremium: true },
  { id: 'backRankMate', name: 'Back Rank Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'smotheredMate', name: 'Smothered Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'hookMate', name: 'Hook Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'anastasiaMate', name: 'Anastasia\'s Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'arabianMate', name: 'Arabian Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'bodensMate', name: 'Boden\'s Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'doubleBishopMate', name: 'Double Bishop Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'dovetailMate', name: 'Dovetail Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'epauletteMate', name: 'Epaulette Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'grecoMate', name: 'Greco\'s Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'lolliMate', name: 'Lolli\'s Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'operaMate', name: 'Opera Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'rankMate', name: 'Rank Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'suffocationMate', name: 'Suffocation Mate', group: 'Tactical Themes', isPremium: true },
  { id: 'swallowTailMate', name: 'Swallow\'s Tail Mate', group: 'Tactical Themes', isPremium: true },

  { id: 'sicilianDefense', name: 'Sicilian Defense (Main)', group: 'Sicilian Defense', isPremium: false },
  { id: 'najdorfVariation', name: 'Najdorf Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'dragonVariation', name: 'Dragon Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'scheveningenVariation', name: 'Scheveningen Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'taimanovVariation', name: 'Taimanov Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'kanVariation', name: 'Kan Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'acceleratedDragon', name: 'Accelerated Dragon', group: 'Sicilian Defense', isPremium: false },
  { id: 'smithMorraGambit', name: 'Smith-Morra Gambit', group: 'Sicilian Defense', isPremium: false },
  { id: 'alapinVariation', name: 'Alapin Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'closedSicilian', name: 'Closed Sicilian', group: 'Sicilian Defense', isPremium: false },
  { id: 'rossolimoAttack', name: 'Rossolimo Attack', group: 'Sicilian Defense', isPremium: false },
  { id: 'grandPrixAttack', name: 'Grand Prix Attack', group: 'Sicilian Defense', isPremium: false },
  { id: 'moscowVariation', name: 'Moscow Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'richterRauzer', name: 'Richter-Rauzer', group: 'Sicilian Defense', isPremium: false },
  { id: 'kalashnikovVariation', name: 'Kalashnikov Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'sveshnikovVariation', name: 'Sveshnikov Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'lowenthalVariation', name: 'Löwenthal Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'pinVariation', name: 'Pin Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'fourKnightsSicilian', name: 'Four Knights Variation', group: 'Sicilian Defense', isPremium: false },
  { id: 'nimzowitschSicilian', name: 'Nimzowitsch Variation', group: 'Sicilian Defense', isPremium: false },

  { id: 'frenchDefense', name: 'French Defense (Main)', group: 'French Defense', isPremium: false },
  { id: 'winawerVariation', name: 'Winawer Variation', group: 'French Defense', isPremium: false },
  { id: 'classicalVariation', name: 'Classical Variation', group: 'French Defense', isPremium: false },
  { id: 'tarraschVariation', name: 'Tarrasch Variation', group: 'French Defense', isPremium: false },
  { id: 'advanceVariation', name: 'Advance Variation', group: 'French Defense', isPremium: false },
  { id: 'exchangeVariation', name: 'Exchange Variation', group: 'French Defense', isPremium: false },
  { id: 'mccutcheonVariation', name: 'McCutcheon Variation', group: 'French Defense', isPremium: false },
  { id: 'burnVariation', name: 'Burn Variation', group: 'French Defense', isPremium: false },
  { id: 'guimardVariation', name: 'Guimard Variation', group: 'French Defense', isPremium: false },
  { id: 'rubinsteinVariation', name: 'Rubinstein Variation', group: 'French Defense', isPremium: false },
  { id: 'fortKnoxVariation', name: 'Fort Knox Variation', group: 'French Defense', isPremium: false },

  { id: 'caroKannDefense', name: 'Caro-Kann Defense (Main)', group: 'Caro-Kann Defense', isPremium: false },
  { id: 'classicalVariation', name: 'Classical Variation', group: 'Caro-Kann Defense', isPremium: false },
  { id: 'advanceVariation', name: 'Advance Variation', group: 'Caro-Kann Defense', isPremium: true },
  { id: 'exchangeVariation', name: 'Exchange Variation', group: 'Caro-Kann Defense', isPremium: false },
  { id: 'panovAttack', name: 'Panov Attack', group: 'Caro-Kann Defense', isPremium: true },
  { id: 'twoKnightsAttack', name: 'Two Knights Attack', group: 'Caro-Kann Defense', isPremium: true },
  { id: 'tartakowerVariation', name: 'Tartakower Variation', group: 'Caro-Kann Defense', isPremium: false },
  { id: 'korchnoiVariation', name: 'Korchnoi Variation', group: 'Caro-Kann Defense', isPremium: true },
  { id: 'bronsteinLarsen', name: 'Bronstein-Larsen Variation', group: 'Caro-Kann Defense', isPremium: true },
  { id: 'gurgenidzeSystem', name: 'Gurgenidze System', group: 'Caro-Kann Defense', isPremium: false },

  { id: 'ruyLopez', name: 'Ruy Lopez (Main)', group: 'Ruy Lopez', isPremium: true },
  { id: 'berlinDefense', name: 'Berlin Defense', group: 'Ruy Lopez', isPremium: false },
  { id: 'marshallAttack', name: 'Marshall Attack', group: 'Ruy Lopez', isPremium: true },
  { id: 'exchangeVariation', name: 'Exchange Variation', group: 'Ruy Lopez', isPremium: true },
  { id: 'openRuyLopez', name: 'Open Ruy Lopez', group: 'Ruy Lopez', isPremium: false },
  { id: 'arkhangelskVariation', name: 'Arkhangelsk Variation', group: 'Ruy Lopez', isPremium: true },
  { id: 'steinitzDefense', name: 'Steinitz Defense', group: 'Ruy Lopez', isPremium: true },
  { id: 'chigorinVariation', name: 'Chigorin Variation', group: 'Ruy Lopez', isPremium: false },
  { id: 'braierVariation', name: 'Breyer Variation', group: 'Ruy Lopez', isPremium: true },
  { id: 'zaitsevVariation', name: 'Zaitsev Variation', group: 'Ruy Lopez', isPremium: true },
  { id: 'karpovVariation', name: 'Karpov Variation', group: 'Ruy Lopez', isPremium: false },
  { id: 'worrallAttack', name: 'Worrall Attack', group: 'Ruy Lopez', isPremium: true },

  { id: 'italianGame', name: 'Italian Game (Main)', group: 'Italian Game', isPremium: false },
  { id: 'giuocoPiano', name: 'Giuoco Piano', group: 'Italian Game', isPremium: true },
  { id: 'evansGambit', name: 'Evans Gambit', group: 'Italian Game', isPremium: true },
  { id: 'twoKnightsDefense', name: 'Two Knights Defense', group: 'Italian Game', isPremium: false },
  { id: 'friedLiverAttack', name: 'Fried Liver Attack', group: 'Italian Game', isPremium: true },
  { id: 'hungarianDefense', name: 'Hungarian Defense', group: 'Italian Game', isPremium: true },
  { id: 'maxLangeAttack', name: 'Max Lange Attack', group: 'Italian Game', isPremium: false },
  { id: 'canalVariation', name: 'Canal Variation', group: 'Italian Game', isPremium: true },
  { id: 'deutzGambit', name: 'Deutz Gambit', group: 'Italian Game', isPremium: true },

  { id: 'scotchGame', name: 'Scotch Game', group: 'Open Games (1.e4 e5)', isPremium: false },
  { id: 'scotchGambit', name: 'Scotch Gambit', group: 'Open Games (1.e4 e5)', isPremium: true },
  { id: 'petrovsDefense', name: 'Petrov\'s Defense', group: 'Open Games (1.e4 e5)', isPremium: true },
  { id: 'philidorDefense', name: 'Philidor Defense', group: 'Open Games (1.e4 e5)', isPremium: false },
  { id: 'viennaGame', name: 'Vienna Game', group: 'Open Games (1.e4 e5)', isPremium: true },
  { id: 'kingsGambit', name: 'King\'s Gambit', group: 'Open Games (1.e4 e5)', isPremium: true },
  { id: 'fourKnightsGame', name: 'Four Knights Game', group: 'Open Games (1.e4 e5)', isPremium: false },
  { id: 'ponzianiOpening', name: 'Ponziani Opening', group: 'Open Games (1.e4 e5)', isPremium: true },
  { id: 'centerGame', name: 'Center Game', group: 'Open Games (1.e4 e5)', isPremium: true },

  { id: 'scandinavianDefense', name: 'Scandinavian Defense', group: 'Semi-Open Games', isPremium: false },
  { id: 'pircDefense', name: 'Pirc Defense', group: 'Semi-Open Games', isPremium: true },
  { id: 'modernDefense', name: 'Modern Defense', group: 'Semi-Open Games', isPremium: true },
  { id: 'alekhineDefense', name: 'Alekhine Defense', group: 'Semi-Open Games', isPremium: false },
  { id: 'nimzowitschDefense', name: 'Nimzowitsch Defense', group: 'Semi-Open Games', isPremium: true },

  { id: 'queensGambit', name: 'Queen\'s Gambit (Main)', group: 'Queen\'s Gambit', isPremium: true },
  { id: 'queensGambitDeclined', name: 'Queen\'s Gambit Declined', group: 'Queen\'s Gambit', isPremium: false },
  { id: 'queensGambitAccepted', name: 'Queen\'s Gambit Accepted', group: 'Queen\'s Gambit', isPremium: true },
  { id: 'slavDefense', name: 'Slav Defense', group: 'Queen\'s Gambit', isPremium: true },
  { id: 'semiSlavDefense', name: 'Semi-Slav Defense', group: 'Queen\'s Gambit', isPremium: false },
  { id: 'albinCountergambit', name: 'Albin Countergambit', group: 'Queen\'s Gambit', isPremium: true },
  { id: 'chigorinDefense', name: 'Chigorin Defense', group: 'Queen\'s Gambit', isPremium: true },
  { id: 'tarraschDefense', name: 'Tarrasch Defense', group: 'Queen\'s Gambit', isPremium: false },
  { id: 'noteboomVariation', name: 'Noteboom Variation', group: 'Queen\'s Gambit', isPremium: true },
  { id: 'meranVariation', name: 'Meran Variation', group: 'Queen\'s Gambit', isPremium: true },
  { id: 'botvinnikVariation', name: 'Botvinnik Variation', group: 'Queen\'s Gambit', isPremium: false },
  { id: 'janowskiVariation', name: 'Janowski Variation', group: 'Queen\'s Gambit', isPremium: true },

  { id: 'kingsIndianDefense', name: 'King\'s Indian Defense', group: 'Indian Defenses', isPremium: false },
  { id: 'nimzoIndianDefense', name: 'Nimzo-Indian Defense', group: 'Indian Defenses', isPremium: true },
  { id: 'grunfeldDefense', name: 'Grünfeld Defense', group: 'Indian Defenses', isPremium: true },
  { id: 'bogoIndianDefense', name: 'Bogo-Indian Defense', group: 'Indian Defenses', isPremium: false },
  { id: 'benoniDefense', name: 'Benoni Defense', group: 'Indian Defenses', isPremium: true },
  { id: 'benkoGambit', name: 'Benko Gambit', group: 'Indian Defenses', isPremium: true },
  { id: 'budapestGambit', name: 'Budapest Gambit', group: 'Indian Defenses', isPremium: false },
  { id: 'oldIndianDefense', name: 'Old Indian Defense', group: 'Indian Defenses', isPremium: true },
  { id: 'saemischVariation', name: 'Sämisch Variation', group: 'Indian Defenses', isPremium: true },
  { id: 'fourPawnsAttack', name: 'Four Pawns Attack', group: 'Indian Defenses', isPremium: false },
  { id: 'averbakhVariation', name: 'Averbakh Variation', group: 'Indian Defenses', isPremium: true },

  { id: 'dutchDefense', name: 'Dutch Defense', group: 'Other d4 Openings', isPremium: false },
  { id: 'londonSystem', name: 'London System', group: 'Other d4 Openings', isPremium: true },
  { id: 'trompowskyAttack', name: 'Trompowsky Attack', group: 'Other d4 Openings', isPremium: true },
  { id: 'colleSystem', name: 'Colle System', group: 'Other d4 Openings', isPremium: false },
  { id: 'veresovAttack', name: 'Veresov Attack', group: 'Other d4 Openings', isPremium: true },
  { id: 'blackmarDiemerGambit', name: 'Blackmar-Diemer Gambit', group: 'Other d4 Openings', isPremium: true },
  { id: 'queensPawnGame', name: 'Queen\'s Pawn Game', group: 'Other d4 Openings', isPremium: false },
  { id: 'richterVeresov', name: 'Richter-Veresov Attack', group: 'Other d4 Openings', isPremium: true },
  { id: 'torreAttack', name: 'Torre Attack', group: 'Other d4 Openings', isPremium: true },

  { id: 'englishOpening', name: 'English Opening', group: 'Flank Openings', isPremium: false },
  { id: 'retiOpening', name: 'Reti Opening', group: 'Flank Openings', isPremium: true },
  { id: 'birdOpening', name: 'Bird Opening', group: 'Flank Openings', isPremium: true },
  { id: 'catalanOpening', name: 'Catalan Opening', group: 'Flank Openings', isPremium: false },
  { id: 'kingsIndianAttack', name: 'King\'s Indian Attack', group: 'Flank Openings', isPremium: true },
  { id: 'nimzoLarsenAttack', name: 'Nimzo-Larsen Attack', group: 'Flank Openings', isPremium: true },
  { id: 'symmetricalEnglish', name: 'Symmetrical English', group: 'Flank Openings', isPremium: false },
  { id: 'reversedSicilian', name: 'Reversed Sicilian (English)', group: 'Flank Openings', isPremium: true },
  { id: 'barczaSystem', name: 'Barcza System', group: 'Flank Openings', isPremium: true },

  { id: 'sokolskyOpening', name: 'Sokolsky (1.b4)', group: 'Irregular Openings', isPremium: false },
  { id: 'grobOpening', name: 'Grob (1.g4)', group: 'Irregular Openings', isPremium: true },
  { id: 'dunstOpening', name: 'Dunst (1.Nc3)', group: 'Irregular Openings', isPremium: true },
  { id: 'saragossaOpening', name: 'Saragossa (1.c3)', group: 'Irregular Openings', isPremium: false },
  { id: 'vanGeetOpening', name: 'Van Geet (1.Nc3)', group: 'Irregular Openings', isPremium: true },
  { id: 'anderssenOpening', name: 'Anderssen (1.a3)', group: 'Irregular Openings', isPremium: true },
];

const PUZZLE_COUNTS = [10, 20, 50, 100, 150, 200, 400];
const CYCLE_COUNTS = [1, 3, 5, 7, 'Infinite'];

interface TrainScreenProps {
  onStart: () => void;
  onShowPaywall: () => void;
  onNavigate: (screen: Screen) => void;
}

export default function TrainScreen({ onStart, onShowPaywall, onNavigate }: TrainScreenProps) {
  const { 
    isPremium, 
    selectedOpening, 
    setSelectedOpening,
    selectedThemes,
    setSelectedThemes,
    minRating,
    setMinRating,
    maxRating,
    setMaxRating,
    targetPuzzleCount,
    setTargetPuzzleCount,
    targetCycles,
    setTargetCycles,
    colorFilter,
    setColorFilter,
    setPuzzles,
    setCurrentPuzzleIndex,
    setCorrectCount,
    setStartTime,
    addSavedSet
  } = useChessStore();
  const savedSets = useChessStore(s => s.savedSets);

  const [searchQuery, setSearchQuery] = useState('');
  const [repositoryStats, setRepositoryStats] = useState<Record<string, number>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<'openers' | 'tactics'>('openers');
  const [allOpenings, setAllOpenings] = useState<any[]>([]);

  useEffect(() => {
    // Fetch repository stats
    fetch('/api/lichess/repository')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const stats: Record<string, number> = {};
          data.data.forEach((row: any) => {
            stats[row.theme] = row.count;
          });
          setRepositoryStats(stats);
        }
      })
      .catch(console.error);

    // Fetch all openings
    fetch('/api/lichess/openings')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setAllOpenings(data.data);
        }
      })
      .catch(console.error);
  }, []);

  const filteredOpenings = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    // Start with hardcoded tactical themes if in tactics tab
    if (activeTab === 'tactics') {
      const tactics = OPENINGS.filter(o => o.group === 'Tactical Themes' && o.name.toLowerCase().includes(query));
      
      // Also include tactical themes from repository stats if they aren't in hardcoded
      const hardcodedTacticsIds = new Set(tactics.map(t => t.id));
      const extraTactics: any[] = [];
      
      Object.keys(repositoryStats).forEach(theme => {
        // Simple heuristic to distinguish tactical themes from openings in repositoryStats
        // Tactical themes are usually single words or camelCase, openings usually have spaces or are in allOpenings
        const isTactical = !allOpenings.some(o => o.name.toLowerCase() === theme.toLowerCase()) && 
                          !OPENINGS.some(o => o.id === theme && o.group !== 'Tactical Themes');
        
        if (isTactical && !hardcodedTacticsIds.has(theme) && theme.toLowerCase().includes(query)) {
          extraTactics.push({
            id: theme,
            name: theme.charAt(0).toUpperCase() + theme.slice(1).replace(/([A-Z])/g, ' $1'),
            group: 'Tactical Themes',
            isPremium: true
          });
        }
      });

      return { 'Tactical Themes': [...tactics, ...extraTactics] };
    }

    // For openers tab, we combine hardcoded ones and fetched ones
    const hardcodedOpeners = OPENINGS.filter(o => o.group !== 'Tactical Themes');
    
    // Group them by their defined group
    const groups: Record<string, any[]> = {};
    
    hardcodedOpeners.forEach(o => {
      if (o.name.toLowerCase().includes(query) || o.group.toLowerCase().includes(query)) {
        if (!groups[o.group]) groups[o.group] = [];
        groups[o.group].push(o);
      }
    });

    // Also include fetched openings if they aren't already in hardcoded
    allOpenings.forEach(o => {
      if (o.name.toLowerCase().includes(query)) {
        // Check if already covered by hardcoded (by name or id)
        const isHardcoded = hardcodedOpeners.some(h => 
          h.name.toLowerCase() === o.name.toLowerCase() || 
          h.id.toLowerCase() === o.name.toLowerCase().replace(/\s+/g, '')
        );
        
        if (!isHardcoded) {
          // Try to find a group for it
          let group = 'Other Openings';
          const mainOpenerGroups = Object.keys(groups).filter(g => g !== 'Other Openings');
          for (const mainGroup of mainOpenerGroups) {
            if (o.name.includes(mainGroup)) {
              group = mainGroup;
              break;
            }
          }
          if (!groups[group]) groups[group] = [];
          
          // Double check for duplicates within the group
          if (!groups[group].some(existing => existing.name.toLowerCase() === o.name.toLowerCase())) {
            groups[group].push({ ...o, id: o.name, group, isPremium: true });
          }
        }
      }
    });
    
    // Sort groups and items within groups
    const sortedGroups: Record<string, any[]> = {};
    const groupKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Other Openings') return 1;
      if (b === 'Other Openings') return -1;
      return a.localeCompare(b);
    });

    groupKeys.forEach(key => {
      sortedGroups[key] = groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });
    return sortedGroups;
  }, [searchQuery, activeTab, allOpenings, repositoryStats]);

  const handleStart = async () => {
    console.log('handleStart called, selectedThemes:', selectedThemes, 'selectedOpening:', selectedOpening);
    if (selectedThemes.length === 0 && (!selectedOpening || selectedOpening === '')) {
      console.log('No theme or opening selected');
      alert('Please select at least one theme or opening');
      return;
    }
    
    console.log('Validation passed, setting isStarting to true');
    setIsStarting(true);
    setLoadingProgress(0);

    if (selectedOpening === 'custom_lichess') {
      const customSet = savedSets.find(s => s.openingSlug === 'custom_lichess');
      if (customSet) {
        setPuzzles(customSet.puzzles);
        setCurrentPuzzleIndex(0);
        setCorrectCount(0);
        setStartTime(Date.now());
        setIsStarting(false);
        onStart();
        return;
      } else {
        alert('Custom set not found.');
        setIsStarting(false);
        return;
      }
    }
    
    setLoadingStatus('Connecting to reservoir...');
    
    const controller = new AbortController();
    setAbortController(controller);
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      const themes = selectedThemes.length > 0 ? selectedThemes.join(',') : selectedOpening;
      const avgRating = Math.floor((minRating + maxRating) / 2);
      setLoadingStatus(`Preparing puzzles for ${selectedThemes.length > 0 ? `${selectedThemes.length} themes` : (OPENINGS.find(o => o.id === selectedOpening)?.name || selectedOpening)}...`);
      
      // Simulate progress for better UX
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 99) {
            if (progressInterval) clearInterval(progressInterval);
            return 99;
          }
          const increment = prev < 30 ? 25 : (prev < 70 ? 15 : (prev < 90 ? 5 : 2));
          return Math.min(prev + increment, 99);
        });
        
        // Update status messages periodically
        setLoadingStatus(prev => {
          if (prev.includes('reservoir')) return 'Searching database...';
          if (prev.includes('database')) return 'Fetching from Lichess...';
          if (prev.includes('Lichess')) return 'Finalizing your puzzle set...';
          return prev;
        });
      }, 500);

      console.log('Initiating fetch to:', `/api/puzzles/batch?theme=${encodeURIComponent(themes)}&count=${targetPuzzleCount}&minRating=${minRating}&maxRating=${maxRating}&color=${encodeURIComponent(colorFilter)}`);
      const fetchStartTime = Date.now();
      const response = await fetch(`/api/puzzles/batch?theme=${encodeURIComponent(themes)}&count=${targetPuzzleCount}&minRating=${minRating}&maxRating=${maxRating}&color=${encodeURIComponent(colorFilter)}`, {
        signal: controller.signal
      });
      console.log('Fetch completed. Response status:', response.status, 'Time taken:', Date.now() - fetchStartTime, 'ms');
      
      const result = await response.json();
      console.log('Fetch result parsed. Time taken:', Date.now() - fetchStartTime, 'ms');
      
      if (!response.ok) {
        throw new Error(`Fetch failed with status: ${response.status}`);
      }

      clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
      setAbortController(null);
      
      setLoadingProgress(100);
      setLoadingStatus('Puzzles ready!');
      
      if (result.puzzles && Array.isArray(result.puzzles) && result.puzzles.length > 0) {
        console.log('Puzzles fetched:', result.puzzles.length);
        
        let openingDisplay = '';
        if (selectedThemes.length > 0) {
          const names = selectedThemes.map(t => {
            const opening = OPENINGS.find(o => o.id === t);
            if (opening) return opening.name.replace(/\s*\(Main\)$/, '');
            return t.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          });
          openingDisplay = names.length === 1 ? names[0] : `${names[0]} + ${names.length - 1} more`;
        } else {
          const opening = OPENINGS.find(o => o.id === selectedOpening);
          openingDisplay = selectedOpening === 'custom_lichess' ? 'My Mistakes' : (opening ? opening.name.replace(/\s*\(Main\)$/, '') : selectedOpening);
        }
          
        const newSet: any = {
          id: Date.now().toString(),
          openingSlug: themes,
          openingDisplay: openingDisplay,
          puzzleCount: result.puzzles.length,
          targetCycles: targetCycles,
          cyclesCompleted: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
          bestAccuracy: 0,
          totalAttempts: 0,
          puzzles: result.puzzles,
        };
        
        setTimeout(() => {
          console.log('Setting puzzles and starting session...', result.puzzles.length);
          setPuzzles(result.puzzles);
          setCurrentPuzzleIndex(0);
          setCorrectCount(0);
          setStartTime(Date.now());
          console.log('Calling addSavedSet with:', newSet);
          addSavedSet(newSet);
          console.log('Setting isStarting to false');
          setIsStarting(false);
          console.log('Calling onStart()');
          onStart();
        }, 100);
      } else {
        throw new Error('Failed to load puzzles: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.log('Setting isStarting to false in catch');
      setIsStarting(false);
      setAbortController(null);
      if (progressInterval) clearInterval(progressInterval);
      console.error('Error starting session:', error);
      setLoadingStatus(`Error: ${error.message}`);
      if (error.name === 'AbortError') {
        alert('Request timed out or cancelled. The server is taking too long to fetch puzzles. Please try again or select a different theme.');
      } else {
        alert('Failed to load puzzles. Please check your connection.');
      }
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
    setIsStarting(false);
    setAbortController(null);
  };

  const toggleTheme = (themeId: string) => {
    if (selectedThemes.includes(themeId)) {
      setSelectedThemes(selectedThemes.filter(t => t !== themeId));
    } else {
      setSelectedThemes([...selectedThemes, themeId]);
    }
    // Clear legacy single selection
    setSelectedOpening('');
  };

  // Estimate: 15 seconds per puzzle on average
  const estimatedSeconds = targetPuzzleCount * (targetCycles === 999 ? 1 : targetCycles) * 15;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  const currentCachedCount = selectedOpening && selectedOpening !== 'custom_lichess' ? (repositoryStats[selectedOpening] || 0) : 0;

  return (
    <div className="h-screen flex flex-col bg-teal-950 text-white">
      <header className="bg-bg-darker p-6 border-b border-border-dark relative">
        <ShareButton />
        <h1 className="font-serif text-4xl font-bold text-brand-gold text-center">Configure Training</h1>
        <p className="text-brand-gold text-center">Set up your spaced repetition cycle.</p>
      </header>
      <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
      {/* Loading Overlay */}
      {isStarting && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bg-dark/95 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-8 max-w-md text-center px-8">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 rounded-full border-4 border-brand-gold/10 border-t-brand-gold" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <PawnIcon size={48} className="text-brand-gold" />
                </motion.div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-serif font-bold text-text-primary tracking-tight">Preparing Reservoir</h2>
              <p className="text-text-muted text-sm leading-relaxed font-medium">
                {loadingStatus}
              </p>
            </div>
            <div className="w-full space-y-2">
              <div className="w-full bg-bg-card h-2 rounded-full overflow-hidden border border-border-dark shadow-inner">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: `${loadingProgress}%` }}
                  className="h-full bg-gradient-to-r from-brand-gold/50 to-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-[2px] text-text-muted">
                <span>Batching</span>
                <span>{loadingProgress}%</span>
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[10px] text-brand-gold uppercase tracking-widest leading-loose">
                Pro Tip: Spaced repetition works best when you solve the same batch multiple times.
              </p>
            </div>
            
            <button 
              onClick={handleCancel}
              className="mt-4 text-xs font-bold text-text-muted hover:text-white transition-colors underline underline-offset-4"
            >
              Cancel Request
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto w-full space-y-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Opening Selection */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6 flex flex-col h-[500px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <Target size={20} className="text-brand-gold" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-400">Select Theme</h2>
                    <p className="text-xs text-text-muted">Choose an opening or tactical theme</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOpening('');
                      setSelectedThemes([]);
                      setMinRating(0);
                      setMaxRating(3000);
                      setTargetPuzzleCount(20);
                      setTargetCycles(1);
                      setColorFilter('both');
                    }}
                    className="text-xs font-bold text-brand-gold hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-bg-dark border border-border-dark rounded-xl p-1 mb-6">
                <button
                  onClick={() => setActiveTab('openers')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'openers' 
                      ? 'bg-brand-gold text-bg-dark shadow-lg' 
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  Opener Themes
                </button>
                <button
                  onClick={() => setActiveTab('tactics')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'tactics' 
                      ? 'bg-brand-gold text-bg-dark shadow-lg' 
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  Tactical Themes
                </button>
              </div>

              <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  id="searchThemes"
                  name="searchThemes"
                  type="text"
                  placeholder="Search themes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-dark border border-border-dark rounded-xl py-3 pl-12 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-gold/50 transition-colors"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                {Object.entries(filteredOpenings).map(([group, openings]) => (
                  <div key={group}>
                    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3 sticky top-0 bg-bg-card py-1 z-10">
                      {group}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(openings as any[]).map((opening, idx) => {
                        const openingId = opening.id || opening.name;
                        const isSelected = selectedThemes.includes(openingId) || selectedOpening === openingId;
                        const isLocked = opening.isPremium && !isPremium;
                        const cachedCount = repositoryStats[openingId] || 0;
                        
                        return (
                          <button
                            key={opening.id || opening.name}
                            onClick={() => {
                              if (isLocked) onShowPaywall();
                              else toggleTheme(openingId);
                            }}
                            className={`relative flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                              isSelected 
                                ? 'bg-brand-gold/10 border-brand-gold text-brand-gold' 
                                : isLocked
                                  ? 'bg-bg-dark/50 border-border-dark/50 text-text-muted hover:border-border-dark'
                                  : 'bg-bg-dark border-border-dark text-text-primary hover:border-brand-gold/50 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium pr-6">{opening.name}</span>
                              {cachedCount > 0 && (
                                <span className="text-[10px] opacity-60">{cachedCount} cached</span>
                              )}
                            </div>
                            {isSelected && (
                              <div className="absolute right-4 w-5 h-5 rounded-full bg-brand-gold text-bg-dark flex items-center justify-center">
                                <CheckCircle2 size={12} strokeWidth={3} />
                              </div>
                            )}
                            {isLocked && !isSelected && (
                              <div className="absolute right-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">
                                <Lock size={10} />
                                Premium
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {Object.keys(filteredOpenings).length === 0 && (
                  <div className="text-center py-10 text-text-muted text-sm">
                    No themes found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Summary */}
          <div className="space-y-6">
            
            {/* Settings Card */}
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6 space-y-8">
              
              {/* Rating Range */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-400">Rating Range</h3>
                  <span className="text-xs font-mono text-brand-gold">{minRating} - {maxRating}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    id="minRating"
                    name="minRating"
                    type="number"
                    value={minRating}
                    onChange={(e) => setMinRating(parseInt(e.target.value) || 0)}
                    className="w-full bg-bg-dark border border-border-dark rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-gold/50"
                    placeholder="Min"
                  />
                  <span className="text-text-muted">-</span>
                  <input 
                    id="maxRating"
                    name="maxRating"
                    type="number"
                    value={maxRating}
                    onChange={(e) => setMaxRating(parseInt(e.target.value) || 0)}
                    className="w-full bg-bg-dark border border-border-dark rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-gold/50"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Puzzles per cycle */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-400">Puzzles per Cycle</h3>
                  <span className="text-xs font-mono text-brand-gold">{targetPuzzleCount}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PUZZLE_COUNTS.map(count => (
                    <button
                      key={count}
                      onClick={() => setTargetPuzzleCount(count)}
                      className={`py-2 px-3 flex-1 min-w-[50px] rounded-lg text-xs font-bold transition-colors ${
                        targetPuzzleCount === count
                          ? 'bg-brand-gold text-bg-dark'
                          : 'bg-bg-dark border border-border-dark text-text-muted hover:text-white hover:border-brand-gold/30'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of cycles */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-400">Target Cycles</h3>
                  <span className="text-xs font-mono text-brand-gold">{targetCycles}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {CYCLE_COUNTS.map(count => (
                    <button
                      key={count}
                      onClick={() => setTargetCycles(count === 'Infinite' ? 999 : count as number)}
                      className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                        (targetCycles === count || (count === 'Infinite' && targetCycles === 999))
                          ? 'bg-brand-gold text-bg-dark'
                          : 'bg-bg-dark border border-border-dark text-text-muted hover:text-white hover:border-brand-gold/30'
                      }`}
                    >
                      {count === 'Infinite' ? '∞' : count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-400">Color Filter</h3>
                  <span className="text-xs font-mono text-brand-gold">{colorFilter}</span>
                </div>
                <div className="flex gap-2">
                  {['both', 'white', 'black'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setColorFilter(filter as any)}
                      className={`py-2 px-3 flex-1 rounded-lg text-xs font-bold transition-colors ${
                        colorFilter === filter
                          ? 'bg-brand-gold text-bg-dark'
                          : 'bg-bg-dark border border-border-dark text-text-muted hover:text-white hover:border-brand-gold/30'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-6">Session Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm">
                  <Target size={16} className="text-text-muted" />
                  <span className="text-text-muted">Theme:</span>
                  <span className="font-bold text-text-primary ml-auto text-right">
                    {selectedOpening === 'custom_lichess' ? 'My Mistakes' : (selectedThemes.length > 0 ? `${selectedThemes.length} themes selected` : (OPENINGS.find(o => o.id === selectedOpening)?.name || 'None selected'))}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Repeat size={16} className="text-text-muted" />
                  <span className="text-text-muted">Total Puzzles:</span>
                  <span className="font-bold text-text-primary ml-auto">
                    {targetCycles === 999 ? '∞' : Number(targetPuzzleCount) * Number(targetCycles)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} className="text-text-muted" />
                  <span className="text-text-muted">Est. Time:</span>
                  <span className="font-bold text-text-primary ml-auto">
                    {targetCycles === 999 ? '∞' : `~${estimatedMinutes} min`}
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                disabled={isStarting}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-bg-dark font-bold text-sm tracking-[2px] uppercase shadow-[0_4px_20px_rgba(212,175,55,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isStarting ? (
                  <div className="w-5 h-5 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin" />
                ) : (
                  <>
                    <Play size={18} className="fill-current" />
                    <span>Start Session</span>
                  </>
                )}
              </motion.button>
            </div>

          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
