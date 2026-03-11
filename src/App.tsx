/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, BarChart2, Swords, BookOpen, Play, Crown, Gamepad2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';

import { useChessStore } from './lib/state/chessStore';
import HomeScreen from './components/HomeScreen';
import SetsScreen from './components/SetsScreen';
import TrainScreen from './components/TrainScreen';
import PersonalizedScreen from './components/PersonalizedScreen';
import StatsScreen from './components/StatsScreen';
import SettingsScreen from './components/SettingsScreen';
import PaywallScreen from './components/PaywallScreen';
import RegisterScreen from './components/RegisterScreen';
import SessionScreen from './components/SessionScreen';

type Tab = 'index' | 'train' | 'personalized' | 'sets' | 'two' | 'session' | 'settings' | 'register';

export default function App() {
  // Force rebuild
  const [activeTab, setActiveTab] = useState<Tab>('index');
  
  useEffect(() => {
    console.log('activeTab changed to:', activeTab);
  }, [activeTab]);
  const [showPaywall, setShowPaywall] = useState(false);
  const isPremium = useChessStore((s) => s.isPremium);
  const setPremium = useChessStore((s) => s.setPremium);
  const fetchUser = useChessStore((s) => s.fetchUser);
  const fetchSavedSets = useChessStore((s) => s.fetchSavedSets);
  const fetchCycleHistory = useChessStore((s) => s.fetchCycleHistory);
  const { setDeviceId } = useChessStore();

  // Sync user on mount
  useEffect(() => {
    const init = async () => {
      // Initialize device ID if not exists
      const stored = localStorage.getItem('openpecker-storage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.state.deviceId) {
            const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
            setDeviceId(id);
          }
        } catch (e) {}
      } else {
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        setDeviceId(id);
      }

      await Promise.all([
        fetchUser(),
        fetchSavedSets(),
        fetchCycleHistory()
      ]);
    };
    init();
  }, [fetchUser, fetchSavedSets, fetchCycleHistory, setDeviceId]);

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
    { id: 'session', label: 'Session', icon: Play },
    { id: 'sets', label: 'Sets', icon: BookOpen },
    { id: 'two', label: 'Stats', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'index':
        return <HomeScreen onStartTraining={() => setActiveTab('train')} onRegister={() => setActiveTab('register')} onShowPaywall={() => setShowPaywall(true)} />;
      case 'train':
        return <TrainScreen onStart={() => { console.log('onStart called, switching to session'); setActiveTab('session'); }} onShowPaywall={() => setShowPaywall(true)} />;
      case 'personalized':
        return <PersonalizedScreen onStart={() => { console.log('onStart called, switching to session'); setActiveTab('session'); }} onShowPaywall={() => setShowPaywall(true)} />;
      case 'session':
        return <SessionScreen onBack={() => setActiveTab('sets')} />;
      case 'sets':
        return <SetsScreen onGoToTrain={() => setActiveTab('train')} onResume={() => setActiveTab('session')} />;
      case 'two':
        return <StatsScreen onShowPaywall={() => setShowPaywall(true)} />;
      case 'settings':
        return <SettingsScreen onShowPaywall={() => setShowPaywall(true)} />;
      case 'register':
        return <RegisterScreen onBack={() => setActiveTab('index')} />;
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
          <Logo size={48} />
          <h1 className="font-serif text-2xl font-bold text-text-primary tracking-tight">
            OpenPecker <span className="text-[10px] text-brand-gold opacity-50">v1.1</span>
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
            <div className={`mb-2 ${isPremium ? 'text-emerald-500' : 'text-brand-gold'} group-hover:scale-110 transition-transform`}>
              {isPremium ? <span className="text-3xl font-bold">✓</span> : <Logo size={48} />}
            </div>
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
        <div className="h-full">
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation Bar for Mobile */}
      <nav className="md:hidden h-16 bg-bg-dark border-t border-border-dark px-2 flex justify-around items-center shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center justify-center min-w-[60px] gap-1 transition-colors duration-200"
              style={{ color: isActive ? '#D4AF37' : '#5A5A72' }}
            >
              <Icon size={20} />
              <span className="text-[8px] font-bold tracking-wider uppercase whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-1 w-1 h-1 bg-brand-gold rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
