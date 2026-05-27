import React, { createContext, useContext, useState, useEffect } from 'react';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const h = (e) => {
      try {
        const inc = Number(e?.detail?.increment || 0);
        setCount((c) => Math.max(0, c + inc));
      } catch (err) { }
    };
    window.addEventListener('snack:loading', h);
    return () => window.removeEventListener('snack:loading', h);
  }, []);

  const value = {
    loadingCount: count,
    isLoading: count > 0,
  };

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export const useLoading = () => useContext(LoadingContext);

export default LoadingContext;
