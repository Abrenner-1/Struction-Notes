import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AuthView } from './views/AuthView';
import { Dashboard } from './views/Dashboard';
import { ProjectView } from './views/ProjectView';
import { ProfileModal } from './components/modals/ProfileModal';
import { ConfirmDeleteProjectModal } from './components/modals/ConfirmDeleteProjectModal';
import { ProjectFormModal } from './components/modals/ProjectFormModal';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { NotificationStack } from './components/layout/NotificationStack';
import { useAuthSession } from './hooks/useAuthSession';
import { useGlobalReminders } from './hooks/useGlobalReminders';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useProjects, type ProjectFormValues } from './hooks/useProjects';
import { useTheme } from './hooks/useTheme';
import { getDashboardPath, getProjectPath, parseAppRoute, type AppRoute, type ProjectTab } from './lib/routes';
import type { Project, TeamMember } from './types';

export default function App() {
  const isOnline = useOnlineStatus();
  const {
    user,
    isGuest,
    loading,
    redirectError,
    handleGuestBypass,
    handleLogout: endSession,
  } = useAuthSession();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    projects,
    isSavingProject,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects(user, isGuest);
  const { notifications, removeNotification } = useGlobalReminders(user, isGuest);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [route, setRoute] = useState<AppRoute>(() => parseAppRoute());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTeamMembers, setEditingTeamMembers] = useState<TeamMember[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const routedProjectId = route.view === 'project' ? route.projectId : null;

  const navigateTo = useCallback((path: string, options?: { replace?: boolean }) => {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentPath !== path) {
      const method = options?.replace ? 'replaceState' : 'pushState';
      window.history[method](null, '', path);
    }

    setRoute(parseAppRoute(path));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseAppRoute());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!routedProjectId) {
      if (selectedProject) {
        setSelectedProject(null);
      }
      return;
    }

    const routedProject = projects.find((project) => project.id === routedProjectId);
    if (routedProject) {
      setSelectedProject(routedProject);
      return;
    }

    if (selectedProject?.id !== routedProjectId) {
      setSelectedProject(null);
      return;
    }
  }, [projects, routedProjectId, selectedProject?.id]);

  const goToDashboard = () => {
    navigateTo(getDashboardPath());
    setIsSidebarOpen(false);
  };

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    navigateTo(getProjectPath(project.id, 'dashboard'));
    setIsSidebarOpen(false);
  };

  const goToProjectTab = (tab: ProjectTab) => {
    if (route.view !== 'project') return;

    navigateTo(getProjectPath(route.projectId, tab));
  };

  const beginProjectEdit = (project: Project) => {
    setEditingProject(project);
    setEditingTeamMembers(project.teamMembers || []);
    setShowEditProjectModal(true);
  };

  const closeProjectEdit = () => {
    setShowEditProjectModal(false);
    setEditingProject(null);
    setEditingTeamMembers([]);
  };

  const requestDeleteProject = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const handleLogout = async () => {
    await endSession();
    navigateTo(getDashboardPath(), { replace: true });
    setSelectedProject(null);
    setIsSidebarOpen(false);
  };

  const handleCreateProject = async (values: ProjectFormValues) => {
    await createProject(values);
    setShowNewProjectModal(false);
  };

  const handleEditProject = async (values: ProjectFormValues) => {
    if (!editingProject) return;

    const updates = await updateProject(editingProject, values, editingTeamMembers);
    if (updates && selectedProject?.id === editingProject.id) {
      setSelectedProject((current) => current ? { ...current, ...updates } as Project : null);
    }

    closeProjectEdit();
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    await deleteProject(projectToDelete);

    if (selectedProject?.id === projectToDelete.id) {
      setSelectedProject(null);
      navigateTo(getDashboardPath());
    }

    closeProjectEdit();
    setShowDeleteConfirm(false);
    setProjectToDelete(null);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthView initialError={redirectError} onGuestBypass={handleGuestBypass} />;
  }

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

      <AppSidebar
        isOpen={isSidebarOpen}
        isOnline={isOnline}
        projects={projects}
        selectedProject={selectedProject}
        view={route.view}
        onClose={() => setIsSidebarOpen(false)}
        onGoDashboard={goToDashboard}
        onLogout={handleLogout}
        onSelectProject={selectProject}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          user={user}
          searchQuery={searchQuery}
          isDarkMode={isDarkMode}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenProfile={() => setShowProfileModal(true)}
          onLogout={handleLogout}
          onSearchChange={setSearchQuery}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950">
          <div className="p-8">
            {route.view === 'dashboard' ? (
              <Dashboard
                projects={projects}
                searchQuery={searchQuery}
                currentUser={user}
                onSelectProject={selectProject}
                onCreateRequest={() => setShowNewProjectModal(true)}
                onEditRequest={beginProjectEdit}
                onDeleteRequest={requestDeleteProject}
              />
            ) : selectedProject ? (
              <div key={selectedProject.id}>
                <ProjectView
                  project={selectedProject}
                  user={user}
                  activeTab={route.tab}
                  onTabChange={goToProjectTab}
                  onEditRequest={beginProjectEdit}
                  onDeleteRequest={requestDeleteProject}
                  onBack={goToDashboard}
                />
              </div>
            ) : (
              <div className="max-w-6xl mx-auto rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                Loading project...
              </div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showNewProjectModal && (
          <ProjectFormModal
            mode="create"
            isLoading={isSavingProject}
            onClose={() => setShowNewProjectModal(false)}
            onSubmit={handleCreateProject}
          />
        )}
        {showEditProjectModal && editingProject && (
          <ProjectFormModal
            mode="edit"
            isLoading={isSavingProject}
            project={editingProject}
            teamMembers={editingTeamMembers}
            onClose={closeProjectEdit}
            onDelete={() => requestDeleteProject(editingProject.id)}
            onSubmit={handleEditProject}
            onTeamMembersChange={setEditingTeamMembers}
          />
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
            isLoading={isSavingProject}
            onConfirm={confirmDeleteProject}
            onClose={() => {
              setShowDeleteConfirm(false);
              setProjectToDelete(null);
            }}
          />
        )}
      </AnimatePresence>

      <NotificationStack notifications={notifications} onRemove={removeNotification} />
    </div>
  );
}
