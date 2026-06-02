import { useEffect } from 'react';

export function useTheme() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('sa-theme', 'light');
  }, []);

  return { theme: 'light', toggle: () => {}, isDark: false };
}

export default useTheme;