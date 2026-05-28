import { useEffect, useState } from 'react';

function getInitialDarkMode() {
  const savedTheme = localStorage.getItem('theme');

  return savedTheme === 'dark' || (
    !savedTheme &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return {
    isDarkMode,
    toggleTheme: () => setIsDarkMode((current) => !current),
  };
}
