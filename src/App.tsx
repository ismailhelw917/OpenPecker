import React, { useState } from 'react';
import { Screen } from './types';
import HomeScreen from './components/HomeScreen';
import TrainScreen from './components/TrainScreen';
import PaywallScreen from './components/PaywallScreen';
import RegisterScreen from './components/RegisterScreen';
import SessionScreen from './components/SessionScreen';
import SetsScreen from './components/SetsScreen';
import SettingsScreen from './components/SettingsScreen';
import StatsScreen from './components/StatsScreen';
import PersonalizedScreen from './components/PersonalizedScreen';
import BottomNav from './components/BottomNav';

const App = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const mainScreens: Screen[] = ['home', 'train', 'sets', 'stats', 'settings'];

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <div className="flex-1 w-4/5 mx-auto">
        {screen === 'home' && (
          <HomeScreen 
            onStartTraining={() => setScreen('train')} 
            onShowPaywall={() => setScreen('paywall')} 
            onRegister={() => setScreen('register')} 
          />
        )}
        {screen === 'train' && (
          <TrainScreen 
            onStart={() => setScreen('session')} 
            onShowPaywall={() => setScreen('paywall')} 
            onNavigate={(s) => setScreen(s)}
          />
        )}
        {screen === 'paywall' && <PaywallScreen onBack={() => setScreen('home')} />}
        {screen === 'register' && <RegisterScreen onBack={() => setScreen('home')} />}
        {screen === 'session' && <SessionScreen onNavigate={(s) => setScreen(s)} />}
        {screen === 'sets' && (
          <SetsScreen 
            onGoToTrain={() => setScreen('train')} 
            onResume={() => setScreen('session')} 
          />
        )}
        {screen === 'settings' && <SettingsScreen onBack={() => setScreen('home')} />}
        {screen === 'stats' && <StatsScreen onBack={() => setScreen('home')} />}
        {screen === 'personalized' && (
          <PersonalizedScreen 
            onStart={() => setScreen('session')} 
            onShowPaywall={() => setScreen('paywall')} 
          />
        )}
      </div>
      {mainScreens.includes(screen) && (
        <BottomNav activeScreen={screen} onNavigate={(s) => setScreen(s)} />
      )}
    </div>
  );
};

export default App;
