import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400 rounded-full transition-colors"
      title={theme === 'dark' ? 'Mudar para Claro' : 'Mudar para Escuro'}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
