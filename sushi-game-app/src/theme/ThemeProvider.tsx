import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { lightTheme, darkTheme, AppTheme } from './theme';
import { preferences, ThemePreference } from '../services/preferences';

type ThemeContextType = {
  // true quando la preferenza salvata è stata caricata (evita il cambio di tema all'avvio)
  isReady: boolean;
  isDarkMode: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  theme: AppTheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  // La preferenza salvata viene caricata all'avvio
  useEffect(() => {
    preferences
      .getTheme()
      .then(setPreferenceState)
      .finally(() => setIsReady(true));
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    preferences.setTheme(value);
  }, []);

  const isDarkMode = preference === 'system' ? deviceColorScheme === 'dark' : preference === 'dark';
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isReady, isDarkMode, preference, setPreference, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useColorScheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ThemeProvider');
  }
  return context;
};
