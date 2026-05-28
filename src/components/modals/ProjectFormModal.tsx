import React from 'react';
import { motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import type { Project, TeamMember } from '../../types';
import { cn } from '../../lib/utils';
import { TEAM_MEMBER_COLORS } from '../../lib/projectUtils';
import type { ProjectFormValues } from '../../hooks/useProjects';

interface ProjectFormModalProps {
  mode: 'create' | 'edit';
  isLoading: boolean;
  project?: Project;
  teamMembers?: TeamMember[];
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
  onTeamMembersChange?: (members: TeamMember[]) => void;
}

function readProjectFormValues(form: HTMLFormElement): ProjectFormValues {
  const formData = new FormData(form);

  return {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    location: formData.get('location') as string,
    substantialCompletionDate: formData.get('substantialCompletionDate') as string,
    projectManager: formData.get('projectManager') as string,
  };
}

export function ProjectFormModal({
  mode,
  isLoading,
  project,
  teamMembers = [],
  onClose,
  onDelete,
  onSubmit,
  onTeamMembersChange,
}: ProjectFormModalProps) {
  const isEditing = mode === 'edit';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(readProjectFormValues(event.currentTarget));
  };

  const removeTeamMember = (index: number) => {
    onTeamMembersChange?.(teamMembers.filter((_, memberIndex) => memberIndex !== index));
  };

  const addTeamMember = () => {
    const initials = prompt('Enter initials for new team member:');
    if (!initials) return;

    const color = TEAM_MEMBER_COLORS[Math.floor(Math.random() * TEAM_MEMBER_COLORS.length)];
    onTeamMembersChange?.([
      ...teamMembers,
      { initials: initials.substring(0, 3).toUpperCase(), color },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-sm">
              {isEditing ? 'Settings' : 'Setup'}
            </h2>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
              {isEditing ? 'Edit Project' : 'New Site Project'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Identity</label>
            <input
              name="name"
              required
              defaultValue={project?.name}
              placeholder="e.g. Skyline Plaza II"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operations Scope</label>
            <textarea
              name="description"
              defaultValue={project?.description}
              placeholder="Brief overview of project objectives..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all h-24 resize-none text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Site Coordinates</label>
            <input
              name="location"
              defaultValue={project?.location}
              placeholder="Address or plot coordinates"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Substantial Completion Date</label>
            <input
              name="substantialCompletionDate"
              type="date"
              defaultValue={project?.substantialCompletionDate}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Manager</label>
            <input
              name="projectManager"
              defaultValue={project?.projectManager}
              placeholder="e.g. Alex Johnson"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm"
            />
          </div>

          {isEditing && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Team Members</label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 mb-3">
                  {teamMembers.map((member, index) => (
                    <div
                      key={`edit-tm-${index}`}
                      className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold', member.color)}
                    >
                      <span>{member.initials}</span>
                      <button
                        type="button"
                        onClick={() => removeTeamMember(index)}
                        className="hover:text-red-200 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {teamMembers.length === 0 && <p className="text-xs text-slate-400 italic">No team members assigned.</p>}
                </div>
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="text-[10px] font-bold text-orange-600 uppercase tracking-widest hover:text-orange-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Member
                </button>
              </div>
            </div>
          )}

          <div className={cn('flex flex-col gap-3', isEditing ? 'mt-2' : 'mt-2')}>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              )}
              {isLoading
                ? (isEditing ? 'Updating...' : 'Initializing...')
                : (isEditing ? 'Update Project' : 'Initialize Project')}
            </button>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isLoading}
                className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
              >
                Delete Project
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
