import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandName, Logo } from './components/Branding';
import { Plus, Bell, PanelLeftClose, PanelLeftOpen, LogOut, User, Search, HardHat, X, LayoutGrid, Sun, Moon } from 'lucide-react';
import { db, auth, handleFirestoreError, logout } from './lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { isBefore, isAfter, subDays } from 'date-fns';
import { Project, Task } from './types';
import { cn } from './lib/utils';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AuthView } from './views/AuthView';
import { Dashboard } from './views/Dashboard';
import { ProjectView } from './views/ProjectView';
import { ProfileModal } from './components/modals/ProfileModal';
import { ConfirmDeleteProjectModal } from './components/modals/ConfirmDeleteProjectModal';

export default function App() {
  const isOnline = useOnlineStatus();
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [bypassedUser, setBypassedUser] = useState<any>(null);
  const user = bypassedUser || firebaseUser;
  const isGuest = user?.uid === 'guest-123';

  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [view, setView] = useState<'dashboard' | 'project'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [notifications, setNotifications] = useState<{ id: string, title: string, projectId: string }[]>([]);
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleGuestBypass = () => {
    setBypassedUser({
      uid: 'guest-123',
      displayName: 'Guest User',
      email: 'guest@local.dev',
      photoURL: null
    });
    setLoading(false);
  };

  useEffect(() => {
    let unmounted = false;
    let redirectChecked = false;
    let authChecked = false;

    const checkComplete = () => {
      if (redirectChecked && authChecked && !unmounted) {
        setLoading(false);
      }
    };

    // Handle redirect result for mobile/fallback sign-in
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        console.log("Redirect Result:", result);
      } catch (error: any) {
        console.error("Redirect Result Error:", error);
        if (!unmounted) {
          if (error.code === 'auth/unauthorized-domain') {
            setRedirectError("Unauthorized Domain: Please add 'structionnotes.com' to your Firebase Console -> Authentication -> Settings -> Authorized domains.");
          } else {
            setRedirectError(error.message);
          }
        }
      } finally {
        redirectChecked = true;
        checkComplete();
      }
    };

    handleRedirect();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!unmounted) {
        console.log("Auth State Changed:", u?.email || "No User");
        setFirebaseUser(u);
        authChecked = true;
        checkComplete();
      }
    });

    return () => {
      unmounted = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    if (isGuest) {
      setProjects(localProjects);
      return;
    }

    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', user.uid)
    );

    return onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      projs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setProjects(projs);
    }, (error) => {
      console.error("Listing Projects Error:", error);
      handleFirestoreError(error, 'list', 'projects');
    });
  }, [user, localProjects, isGuest]);

  // Global Reminder System
  useEffect(() => {
    if (!user) return;
    
    if (isGuest) return; // Skip global reminders in guest mode for simplicity

    // Listen to all tasks across all projects for this user
    const q = query(
      collectionGroup(db, 'tasks'),
      where('ownerId', '==', user.uid),
      where('completed', '==', false)
    );

    const checkReminders = (tasks: Task[]) => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.reminderAt) {
          const reminderTime = task.reminderAt.toDate();
          // Trigger notification if reminder time has passed within the last 24 hours
          if (isBefore(reminderTime, now) && isAfter(reminderTime, subDays(now, 1))) {
            addNotification(
              task.id, 
              `Alert: ${task.title} ${task.projectName ? `[${task.projectName}]` : ''}`, 
              task.projectId
            );
          }
        }
      });
    };

    let activeTasks: Task[] = [];

    const unsubscribe = onSnapshot(q, (snapshot) => {
      activeTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      checkReminders(activeTasks);
    }, (error) => {
      console.warn("Global task listener may require an index in Firebase console:", error);
    });

    // Also run a periodic check for reminders that trigger while the app is open
    const interval = setInterval(() => {
      checkReminders(activeTasks);
    }, 30000); // Check every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user]);

  const addNotification = (id: string, title: string, projectId: string) => {
    if (shownNotificationsRef.current.has(id)) return;
    setNotifications(prev => {
      if (prev.some(n => n.id === id)) return prev;
      return [...prev, { id, title, projectId }];
    });
    shownNotificationsRef.current.add(id);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleLogout = async () => {
    if (isGuest) {
      setBypassedUser(null);
      setView('dashboard');
      setSelectedProject(null);
      return;
    }
    await logout();
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || isCreating) return;
    
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const projectData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      substantialCompletionDate: formData.get('substantialCompletionDate') as string,
      projectManager: formData.get('projectManager') as string,
      ownerId: user.uid,
      lastEditedBy: user.displayName || 'Alex Johnson',
      teamMembers: [
        { initials: (user.displayName || 'Alex Johnson').split(' ').map((n: string) => n[0]).join(''), color: 'bg-slate-700' }
      ],
      updatedAt: serverTimestamp()
    };

    try {
      if (isGuest) {
        const dummyTimestamp = { toMillis: () => Date.now() };
        const newProj = { 
          ...projectData, 
          id: crypto.randomUUID(), 
          createdAt: dummyTimestamp,
          updatedAt: dummyTimestamp
        } as any;
        setLocalProjects(prev => [newProj, ...prev]);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...projectData,
          createdAt: serverTimestamp()
        });
      }
      setShowNewProjectModal(false);
    } catch (err) {
      handleFirestoreError(err, 'create', 'projects');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !editingProject || isCreating) return;
    
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      substantialCompletionDate: formData.get('substantialCompletionDate') as string,
      projectManager: formData.get('projectManager') as string,
      lastEditedBy: user.displayName || 'Alex Johnson',
      updatedAt: serverTimestamp()
    };

    try {
      if (isGuest) {
        setLocalProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...updates } as any : p));
      } else {
        await updateDoc(doc(db, 'projects', editingProject.id), updates);
      }
      setShowEditProjectModal(false);
      setEditingProject(null);
    } catch (err) {
      handleFirestoreError(err, 'update', `projects/${editingProject.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProject = async () => {
    if (!user || isCreating || !projectToDelete) return;

    setIsCreating(true);
    try {
      if (isGuest) {
        setLocalProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      } else {
        await deleteDoc(doc(db, 'projects', projectToDelete.id));
      }
      
      if (selectedProject?.id === projectToDelete.id) {
        setSelectedProject(null);
        setView('dashboard');
      }
      setShowEditProjectModal(false);
      setEditingProject(null);
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
    } catch (err) {
      handleFirestoreError(err, 'delete', `projects/${projectToDelete.id}`);
    } finally {
      setIsCreating(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full" />
          <Logo className="w-24 h-24 relative z-10" />
        </motion.div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-slate-400 text-[10px] font-black animate-pulse tracking-[0.3em] uppercase">Struction Notes</p>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-orange-500 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthView initialError={redirectError} onGuestBypass={handleGuestBypass} />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 overflow-hidden relative">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-brand-navy text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 lg:relative lg:translate-x-0 lg:flex",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center cursor-pointer" onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}>
              <BrandName className="h-10" />
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-800 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Projects</p>
            {projects.map((p, pIdx) => (
              <button 
                key={`${p.id}-${pIdx}`}
                onClick={() => {
                  setSelectedProject(p);
                  setView('project');
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                  selectedProject?.id === p.id && view === 'project' ? "bg-white/10 text-white" : "hover:bg-white/5"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", selectedProject?.id === p.id ? "bg-brand-orange" : "bg-slate-600")}></span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {projects.length === 0 && <p className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 italic">No projects created</p>}
          </nav>

          <nav className="mt-8 space-y-1">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Library</p>
            <button onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-md text-sm text-left">
              <LayoutGrid className="w-4 h-4 opacity-70" />
              <span>All Projects</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800 bg-black/20 space-y-4">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
            )}></div>
            {isOnline ? 'Cloud Synced' : 'Offline Mode (Local)'}
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-brand-navy border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent rounded-lg text-sm focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-3 text-right hover:bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl transition-all group"
            >
              <div className="flex flex-col items-end">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 hidden sm:block group-hover:text-orange-500 transition-colors">{user.displayName || 'Alex Johnson'}</p>
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
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950">
          <div className="p-8">
            {view === 'dashboard' ? (
              <Dashboard 
                projects={projects} 
                searchQuery={searchQuery}
                currentUser={user}
                onSelectProject={(p) => {
                  setSelectedProject(p);
                  setView('project');
                }}
                onCreateRequest={() => setShowNewProjectModal(true)}
                onEditRequest={(p) => {
                  setEditingProject(p);
                  setShowEditProjectModal(true);
                }}
                onDeleteRequest={handleDeleteProject}
              />
            ) : selectedProject ? (
              <div key={selectedProject.id}>
                <ProjectView 
                  project={selectedProject} 
                  user={user}
                  onEditRequest={(p) => {
                    setEditingProject(p);
                    setShowEditProjectModal(true);
                  }}
                  onDeleteRequest={handleDeleteProject}
                  onBack={() => setView('dashboard')} 
                />
              </div>
            ) : null}
          </div>
        </main>
      </div>

        {/* Modals */}
        <AnimatePresence>
          {showNewProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-sm">Setup</h2>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">New Site Project</h2>
                </div>
                <button onClick={() => setShowNewProjectModal(false)} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Identity</label>
                  <input name="name" required placeholder="e.g. Skyline Plaza II" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operations Scope</label>
                  <textarea name="description" placeholder="Brief overview of project objectives..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all h-24 resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Site Coordinates</label>
                  <input name="location" placeholder="Address or plot coordinates" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Substantial Completion Date</label>
                  <input name="substantialCompletionDate" type="date" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Manager</label>
                  <input name="projectManager" placeholder="e.g. Alex Johnson" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" />
                </div>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />}
                  {isCreating ? 'Initializing...' : 'Initialize Project'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showEditProjectModal && editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-sm">Settings</h2>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Edit Project</h2>
                </div>
                <button onClick={() => { setShowEditProjectModal(false); setEditingProject(null); }} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleEditProject} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Identity</label>
                  <input name="name" required defaultValue={editingProject.name} placeholder="e.g. Skyline Plaza II" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operations Scope</label>
                  <textarea name="description" defaultValue={editingProject.description} placeholder="Brief overview of project objectives..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all h-24 resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Site Coordinates</label>
                  <input name="location" defaultValue={editingProject.location} placeholder="Address or plot coordinates" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Substantial Completion Date</label>
                  <input name="substantialCompletionDate" type="date" defaultValue={editingProject.substantialCompletionDate} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Manager</label>
                  <input name="projectManager" defaultValue={editingProject.projectManager} placeholder="e.g. Alex Johnson" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" />
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  <button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreating && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />}
                    {isCreating ? 'Updating...' : 'Update Project'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDeleteProject(editingProject.id)}
                    disabled={isCreating}
                    className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                  >
                    Delete Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showProfileModal && (
          <ProfileModal 
            user={user} 
            onClose={() => setShowProfileModal(false)} 
          />
        )}
        {showDeleteConfirm && projectToDelete && (
          <ConfirmDeleteProjectModal 
            projectName={projectToDelete.name}
            isLoading={isCreating}
            onConfirm={confirmDeleteProject}
            onClose={() => {
              setShowDeleteConfirm(false);
              setProjectToDelete(null);
            }}
          />
        )}
        {/* Notifications */}
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, x: 50 }}
                className="bg-slate-900 text-white px-5 py-4 rounded-xl shadow-2xl flex items-start gap-4 min-w-[300px] border border-slate-800"
              >
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Task Alert</p>
                  <p className="text-sm font-semibold">{n.title}</p>
                </div>
                <button 
                  onClick={() => removeNotification(n.id)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </AnimatePresence>
    </div>
  );
}

// --- DASHBOARD VIEW ---
