import { useCallback, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import type { Project, TeamMember } from '../types';
import { createLocalTimestamp, DEFAULT_USER_NAME, getInitials } from '../lib/projectUtils';

export interface ProjectFormValues {
  name: string;
  description: string;
  location: string;
  substantialCompletionDate: string;
  projectManager: string;
}

type ProjectUpdates = ProjectFormValues & {
  teamMembers: TeamMember[];
  lastEditedBy: string;
  updatedAt: any;
};

export function useProjects(user: any, isGuest: boolean) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [isSavingProject, setIsSavingProject] = useState(false);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    if (isGuest) {
      setProjects(localProjects);
      return;
    }

    const projectsQuery = query(
      collection(db, 'projects'),
      where('ownerId', '==', user.uid),
    );

    return onSnapshot(projectsQuery, (snapshot) => {
      const fetchedProjects = snapshot.docs.map((projectDoc) => ({
        id: projectDoc.id,
        ...projectDoc.data(),
      } as Project));

      fetchedProjects.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setProjects(fetchedProjects);
    }, (error) => {
      console.error('Listing Projects Error:', error);
      handleFirestoreError(error, 'list', 'projects');
    });
  }, [user, localProjects, isGuest]);

  const createProject = useCallback(async (values: ProjectFormValues) => {
    if (!user || isSavingProject) return;

    setIsSavingProject(true);
    const editorName = user.displayName || DEFAULT_USER_NAME;
    const projectData = {
      ...values,
      ownerId: user.uid,
      lastEditedBy: editorName,
      teamMembers: [
        { initials: getInitials(editorName), color: 'bg-slate-700' },
      ],
      updatedAt: serverTimestamp(),
    };

    try {
      if (isGuest) {
        const createdAt = createLocalTimestamp();
        const newProject = {
          ...projectData,
          id: crypto.randomUUID(),
          createdAt,
          updatedAt: createdAt,
        } as any;

        setLocalProjects((current) => [newProject, ...current]);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...projectData,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, 'create', 'projects');
    } finally {
      setIsSavingProject(false);
    }
  }, [isGuest, isSavingProject, user]);

  const updateProject = useCallback(async (
    project: Project,
    values: ProjectFormValues,
    teamMembers: TeamMember[],
  ): Promise<ProjectUpdates | undefined> => {
    if (!user || isSavingProject) return undefined;

    setIsSavingProject(true);
    const updates = {
      ...values,
      teamMembers,
      lastEditedBy: user.displayName || DEFAULT_USER_NAME,
      updatedAt: isGuest ? createLocalTimestamp() : serverTimestamp(),
    };

    try {
      if (isGuest) {
        setLocalProjects((current) => (
          current.map((localProject) => (
            localProject.id === project.id
              ? { ...localProject, ...updates } as any
              : localProject
          ))
        ));
      } else {
        await updateDoc(doc(db, 'projects', project.id), updates);
      }

      return updates;
    } catch (error) {
      handleFirestoreError(error, 'update', `projects/${project.id}`);
      return undefined;
    } finally {
      setIsSavingProject(false);
    }
  }, [isGuest, isSavingProject, user]);

  const deleteProject = useCallback(async (project: Project) => {
    if (!user || isSavingProject) return;

    setIsSavingProject(true);

    try {
      if (isGuest) {
        setLocalProjects((current) => current.filter((localProject) => localProject.id !== project.id));
      } else {
        await deleteDoc(doc(db, 'projects', project.id));
      }
    } catch (error) {
      handleFirestoreError(error, 'delete', `projects/${project.id}`);
    } finally {
      setIsSavingProject(false);
    }
  }, [isGuest, isSavingProject, user]);

  return {
    projects,
    isSavingProject,
    createProject,
    updateProject,
    deleteProject,
  };
}
