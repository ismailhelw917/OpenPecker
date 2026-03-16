import React from 'react';
import { Home, Target, Database, BarChart2, Settings } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  const navItems: { screen: Screen; icon: React.ElementType; label: string }[] = [
    { screen: 'home', icon: Home, label: 'Home' },
    { screen: 'train', icon: Target, label: 'Train' },
    { screen: 'sets', icon: Database, label: 'Sets' },
    { screen: 'stats', icon: BarChart2, label: 'Stats' },
    { screen: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <footer className="bg-bg-darker p-4 border-t border-border-dark flex justify-around">
      {navItems.map((item) => (
        <button
          key={item.screen}
          onClick={() => onNavigate(item.screen)}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeScreen === item.screen ? 'text-brand-gold' : 'text-text-muted hover:text-white'
          }`}
        >
          <item.icon size={20} />
          <span className="text-[10px] uppercase">{item.label}</span>
        </button>
      ))}
    </footer>
  );
}
