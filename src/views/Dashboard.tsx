import React from 'react';
import { motion } from 'motion/react';
import { Edit3, Trash, Calendar, Clock } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Project } from '../types';
import { cn } from '../lib/utils';

export function Dashboard({ projects, onSelectProject, onCreateRequest, onEditRequest, onDeleteRequest, searchQuery, currentUser }: { 
  projects: Project[], 
  onSelectProject: (p: Project) => void,
  onCreateRequest: () => void,
  onEditRequest: (p: Project) => void,
  onDeleteRequest: (id: string) => void,
  searchQuery: string,
  currentUser: any
}) {
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">ARCHITECTURE & PLANNING</h2>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Project Workspace</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onCreateRequest}
            className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-orange-700 transition-all shadow-sm"
          >
            Create Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project, projIdx) => (
          <motion.div
            key={`proj-card-${project.id}-${projIdx}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onSelectProject(project)}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-orange-500/50 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{project.name}</h3>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRequest(project);
                  }}
                  className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-500 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteRequest(project.id);
                  }}
                  className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete Project"
                >
                  <Trash className="w-4 h-4 pointer-events-none" />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4">
              {project.description || 'No description provided.'}
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                {project.location || 'Site Location TBD'}
            </p>
            {project.substantialCompletionDate && (
              <div className="flex items-center gap-2 text-xs font-bold text-orange-600 mb-6 uppercase tracking-widest">
                <Calendar className="w-3.5 h-3.5" />
                Substantial Completion: {format(parseISO(project.substantialCompletionDate), 'MMM dd, yyyy')}
              </div>
            )}
            {!project.substantialCompletionDate && <div className="mb-6" />}
            <div className="flex items-center justify-between text-xs text-slate-400 border-t pt-4">
               <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <div>
                      <p>Last Edited:</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {project.updatedAt ? formatDistanceToNow(project.updatedAt.toDate(), { addSuffix: true }) : (project.createdAt ? formatDistanceToNow(project.createdAt.toDate(), { addSuffix: true }) : 'just now')}
                      </p>
                      <p>by {project.lastEditedBy || project.projectManager || currentUser?.displayName || 'Alex Johnson'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                   <p>Team Members:</p>
                   <div className="flex -space-x-2">
                       {project.teamMembers ? (
                         project.teamMembers.map((member, idx) => (
                           <div key={`tm-${project.id}-${member.initials}-${idx}`} className={cn("w-8 h-8 rounded-full text-white flex items-center justify-center border-2 border-white text-xs font-bold", member.color)}>
                             {member.initials}
                           </div>
                         ))
                       ) : (
                         <div key={`tm-fallback-${project.id}`} className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center border-2 border-white text-xs font-bold">
                           {(currentUser?.displayName || 'Alex Johnson').split(' ').map((n: string) => n[0]).join('')}
                         </div>
                       )}
                   </div>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
