import { useEffect, useState } from 'react';
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
import type { Project, TeamMember } from './types';

type AppView = 'dashboard' | 'project';

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
  const [view, setView] = useState<AppView>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTeamMembers, setEditingTeamMembers] = useState<TeamMember[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    if (!selectedProject) return;

    const latestProject = projects.find((project) => project.id === selectedProject.id);
    if (latestProject) {
      setSelectedProject(latestProject);
      return;
    }

    setSelectedProject(null);
    if (view === 'project') {
      setView('dashboard');
    }
  }, [projects, selectedProject?.id, view]);

  const goToDashboard = () => {
    setView('dashboard');
    setIsSidebarOpen(false);
  };

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    setView('project');
    setIsSidebarOpen(false);
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
    setView('dashboard');
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
      setView('dashboard');
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
        view={view}
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
            {view === 'dashboard' ? (
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
                  onEditRequest={beginProjectEdit}
                  onDeleteRequest={requestDeleteProject}
                  onBack={goToDashboard}
                />
              </div>
            ) : null}
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
