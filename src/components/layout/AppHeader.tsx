import { LayoutGrid, LogOut, Moon, Search, Sun } from 'lucide-react';

interface AppHeaderProps {
  user: any;
  searchQuery: string;
  isDarkMode: boolean;
  onOpenSidebar: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onSearchChange: (value: string) => void;
  onToggleTheme: () => void;
}

export function AppHeader({
  user,
  searchQuery,
  isDarkMode,
  onOpenSidebar,
  onOpenProfile,
  onLogout,
  onSearchChange,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-brand-navy border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-lg lg:hidden transition-colors"
        >
          <LayoutGrid className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="relative w-64 sm:w-96 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search across projects..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent rounded-lg text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-3 text-right hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-xl transition-all group"
        >
          <div className="flex flex-col items-end">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 hidden sm:block group-hover:text-orange-500 transition-colors">
              {user.displayName || 'Alex Johnson'}
            </p>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">View Profile</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm group-hover:border-orange-200 transition-all">
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-orange-500 text-white font-bold">
                {(user.displayName || 'A').charAt(0)}
              </div>
            )}
          </div>
        </button>
        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
