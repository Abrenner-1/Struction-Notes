import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Edit3, Image as ImageIcon, ChevronRight, X, Clock, MapPin, GripVertical, FileSpreadsheet, LayoutGrid, CheckCircle2, ChevronDown, Plus, LogOut, Search, Trash, Calendar, FileText, Bell, HardHat, PanelLeftClose, PanelLeftOpen, User, Circle, Settings } from 'lucide-react';
import { formatDistanceToNow, format, isSameDay, isBefore } from 'date-fns';
import { db, auth, handleFirestoreError, logout } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Task, Note, ProjectPage, Project, NoteType, ScheduleItem } from '../types';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export function TaskItem({ task, toggleTask, setEditingTask, onDelete, project, isHighlighted, dragHandleProps, isDragging }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const taskRef = useRef<HTMLDivElement>(null);
  const isOverdue = task.dueDate && isBefore(task.dueDate.toDate(), new Date()) && !task.completed;

  const handleDelete = async () => {
    await onDelete();
    setShowConfirmDelete(false);
  };

  useEffect(() => {
    if (isHighlighted && taskRef.current) {
      taskRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  return (
    <div 
      ref={taskRef}
      {...dragHandleProps}
      className={cn(
        "p-4 rounded-xl shadow-sm flex items-start gap-3 group border-l-4 h-fit",
        !isDragging && "transition-all",
        task.completed ? "border-l-emerald-500 opacity-60 bg-white dark:bg-slate-900" : 
        isOverdue ? "border-l-red-500 bg-white dark:bg-slate-900" : "border-l-blue-500 bg-white dark:bg-slate-900",
        isHighlighted ? "ring-2 ring-orange-500 border-orange-500 scale-[1.02] z-10" : "border-slate-200 dark:border-slate-700"
      )}
    >
      <button onClick={() => toggleTask(task)} className="mt-1 transition-transform hover:scale-110 shrink-0">
        {task.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h4 className={cn("font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight", task.completed ? "line-through text-slate-400" : "group-hover:text-orange-600")}>
              {task.title}
            </h4>
            {task.description && (
              <div className="mt-2 relative">
                <div 
                  className={cn(
                    "text-[11px] text-slate-500 leading-relaxed prose prose-slate prose-xs max-w-none break-words overflow-hidden transition-all duration-300",
                    "whitespace-pre-wrap [overflow-wrap:anywhere]",
                    task.completed && "text-slate-300 line-through",
                    (!isExpanded && task.description.length > 150) && "max-h-24"
                  )}
                  style={(!isExpanded && task.description.length > 150) ? { 
                    maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', 
                    WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' 
                  } : {}}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.description) }}
                />
                {task.description.length > 150 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-orange-500 uppercase tracking-widest hover:text-orange-600"
                  >
                    {isExpanded ? 'Show Less' : 'Show Full Description'}
                    <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className={cn(
            "flex items-center gap-1 transition-all shrink-0 bg-white dark:bg-slate-900 shadow-sm p-1 rounded-lg",
            !showConfirmDelete ? "opacity-100 lg:opacity-0 lg:group-hover:opacity-100" : "opacity-100"
          )}>
            {!showConfirmDelete ? (
              <>
                <button 
                  onClick={() => setEditingTask(task)}
                  className="p-1 text-slate-400 hover:text-orange-500 transition-all"
                  title="Edit Task"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-all"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-1">
                <button 
                  onClick={handleDelete}
                  className="text-[10px] font-bold text-red-600 uppercase hover:underline"
                >
                  Confirm
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  className="text-[10px] font-bold text-slate-400 uppercase hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {task.dueDate && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
              isOverdue ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            )}>
              {format(task.dueDate.toDate(), 'MMM dd')}
            </span>
          )}
          {task.reminderAt && !task.completed && (
            <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
              <Bell className="w-2.5 h-2.5 text-orange-500" />
              <span className="text-[10px] font-bold text-orange-600 uppercase">Alert</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
