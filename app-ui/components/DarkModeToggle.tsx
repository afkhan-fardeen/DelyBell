'use client';

import { useEffect, useState } from 'react';

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    setIsDark(html.classList.contains('dark'));
  };

  return (
    <div className="fixed bottom-6 right-6">
      <button
        className="p-3 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-full shadow-lg hover:scale-110 transition-transform"
        onClick={toggleDarkMode}
      >
        {isDark ? (
          <span className="material-icons-outlined text-yellow-400">light_mode</span>
        ) : (
          <span className="material-icons-outlined">dark_mode</span>
        )}
      </button>
    </div>
  );
}
