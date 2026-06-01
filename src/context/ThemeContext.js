import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const themeColors = {
  light: {
    bg: '#f5f5f5',
    phBg: '#ffffff',
    text: '#1a1a1a',
    textSec: '#666666',
    surface: '#ffffff',
    border: '#eeeeee',
    primary: '#FF0000',
    primaryGrad: ['#FF0000', '#8B0000'],
    primaryGlow: 'rgba(255, 0, 0, 0.35)',
    navBg: 'rgba(255, 255, 255, 0.9)',
    statusBar: 'dark-content',
    placeholder: '#999999',
  },
  dark: {
    bg: '#000000',
    phBg: '#000000',
    text: '#ffffff',
    textSec: '#aaaaaa',
    surface: '#111111',
    border: '#222222',
    primary: '#FF0000',
    primaryGrad: ['#FF0000', '#8B0000'],
    primaryGlow: 'rgba(255, 0, 0, 0.35)',
    navBg: 'rgba(0, 0, 0, 0.9)',
    statusBar: 'light-content',
    placeholder: '#444444',
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = themeColors[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
