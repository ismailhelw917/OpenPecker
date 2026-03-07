/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, BarChart2, Swords, BookOpen, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useChessStore } from './lib/state/chessStore';
import HomeScreen from './components/HomeScreen';
import SetsScreen from './components/SetsScreen';
import TrainScreen from './components/TrainScreen';
import PersonalizedScreen from './components/PersonalizedScreen';
import DatabaseScreen from './components/DatabaseScreen';
import StatsScreen from './components/StatsScreen';
import PaywallScreen from './components/PaywallScreen';
import GameScreen from './components/GameScreen';

type Tab = 'index' | 'train' | 'personalized' | 'database' | 'sets' | 'two' | 'session';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('index');
  const [showPaywall, setShowPaywall] = useState(false);
  const isPremium = useChessStore((s) => s.isPremium);
  const setPremium = useChessStore((s) => s.setPremium);

  // Check for Stripe session in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    if (sessionId) {
      const verifySession = async () => {
        try {
          const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
          const result = await response.json();
          if (result.data?.status === 'paid') {
            setPremium(true);
            alert('Welcome to Premium! Your account has been upgraded.');
            // Clean up URL
            window.history.replaceState({}, document.title, "/");
          }
        } catch (error) {
          console.error('Verification Error:', error);
        }
      };
      verifySession();
    }
  }, [setPremium]);

  const tabs = [
    { id: 'index', label: 'Home', icon: Home },
    { id: 'train', label: 'Train', icon: Swords },
    { id: 'personalized', label: 'My Games', icon: Play },
    { id: 'database', label: 'Database', icon: BookOpen },
    { id: 'session', label: 'Session', icon: Play },
    { id: 'sets', label: 'Sets', icon: BookOpen },
    { id: 'two', label: 'Stats', icon: BarChart2 },
  ] as const;

  const renderContent = () => {
    console.log('Rendering content for tab:', activeTab);
    switch (activeTab) {
      case 'index':
        return <HomeScreen onStartTraining={() => setActiveTab('train')} onShowPaywall={() => setShowPaywall(true)} />;
      case 'train':
        return <TrainScreen onStart={() => setActiveTab('session')} onShowPaywall={() => setShowPaywall(true)} />;
      case 'personalized':
        return <PersonalizedScreen onStart={() => setActiveTab('session')} onShowPaywall={() => setShowPaywall(true)} />;
      case 'database':
        return <DatabaseScreen onStart={() => setActiveTab('session')} onShowPaywall={() => setShowPaywall(true)} />;
      case 'session':
        return <GameScreen onBack={() => setActiveTab('sets')} />;
      case 'sets':
        return <SetsScreen onGoToTrain={() => setActiveTab('train')} onResume={() => setActiveTab('session')} />;
      case 'two':
        return <StatsScreen onShowPaywall={() => setShowPaywall(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg-dark text-white overflow-hidden font-sans">
      <AnimatePresence>
        {showPaywall && (
          <PaywallScreen onClose={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-bg-dark border-r border-border-dark p-6 shrink-0">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-12 h-12 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
            <span className="text-3xl text-brand-gold">♚</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-text-primary tracking-tight">
            OpenPecker
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20' 
                    : 'text-text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-brand-gold' : 'text-text-muted group-hover:text-white'} />
                <span className="text-sm font-bold tracking-wider uppercase">
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="ml-auto w-1.5 h-1.5 bg-brand-gold rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border-dark">
          <button 
            onClick={isPremium ? undefined : () => setShowPaywall(true)}
            className={`w-full flex flex-col items-center gap-3 px-4 py-8 rounded-2xl border group transition-all ${
              isPremium 
                ? 'bg-emerald-500/10 border-emerald-500/30 cursor-default' 
                : 'bg-gradient-to-b from-brand-gold/20 to-transparent border-brand-gold/30 hover:from-brand-gold/30'
            }`}
          >
            <span className={`text-3xl ${isPremium ? 'text-emerald-500' : 'text-brand-gold'} group-hover:scale-110 transition-transform mb-2`}>
              {isPremium ? '✓' : '♔'}
            </span>
            <div className="text-center">
              <p className={`text-sm font-bold uppercase tracking-[3px] ${isPremium ? 'text-emerald-500' : 'text-brand-gold'}`}>
                {isPremium ? 'Premium Active' : 'Go Premium'}
              </p>
              <p className="text-[10px] text-text-muted mt-1">
                {isPremium ? 'All openings unlocked' : 'Unlock all 150+ openings'}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar for Mobile */}
      <nav className="md:hidden h-20 bg-bg-dark border-t border-border-dark pb-4 pt-2 px-4 flex justify-around items-center shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center justify-center gap-1 transition-colors duration-200"
              style={{ color: isActive ? '#D4AF37' : '#5A5A72' }}
            >
              <Icon size={24} />
              <span className="text-[10px] font-bold tracking-wider uppercase">
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-2 w-1 h-1 bg-brand-gold rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
