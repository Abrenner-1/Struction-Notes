import { LayoutGrid, LogOut, X } from 'lucide-react';
import { BrandName } from '../Branding';
import type { Project } from '../../types';
import { cn } from '../../lib/utils';

interface AppSidebarProps {
  isOpen: boolean;
  isOnline: boolean;
  projects: Project[];
  selectedProject: Project | null;
  view: 'dashboard' | 'project';
  onClose: () => void;
  onGoDashboard: () => void;
  onLogout: () => void;
  onSelectProject: (project: Project) => void;
}

export function AppSidebar({
  isOpen,
  isOnline,
  projects,
  selectedProject,
  view,
  onClose,
  onGoDashboard,
  onLogout,
  onSelectProject,
}: AppSidebarProps) {
  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-50 w-64 bg-brand-navy text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 lg:relative lg:translate-x-0 lg:flex',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    )}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center cursor-pointer" onClick={onGoDashboard}>
            <BrandName className="h-10" />
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Projects</p>
          {projects.map((project, index) => (
            <button
              key={`${project.id}-${index}`}
              onClick={() => onSelectProject(project)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                selectedProject?.id === project.id && view === 'project'
                  ? 'bg-white/10 text-white'
                  : 'hover:bg-white/5',
              )}
            >
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                selectedProject?.id === project.id ? 'bg-brand-orange' : 'bg-slate-600',
              )} />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
          {projects.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 italic">No projects created</p>
          )}
        </nav>

        <nav className="mt-8 space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Library</p>
          <button
            onClick={onGoDashboard}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-md text-sm text-left"
          >
            <LayoutGrid className="w-4 h-4 opacity-70" />
            <span>All Projects</span>
          </button>
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800 bg-black/20 space-y-4">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isOnline
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
              : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
          )} />
          {isOnline ? 'Cloud Synced' : 'Offline Mode (Local)'}
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Account</span>
        </button>
      </div>
    </aside>
  );
}
