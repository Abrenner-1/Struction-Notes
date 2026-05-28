import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, ChevronDown, Circle, GripVertical, Settings, Trash2 } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';

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
      className={cn(
        "rounded-xl shadow-sm flex items-stretch group border-l-4 h-fit overflow-hidden relative",
        !isDragging && "transition-all",
        task.completed ? "border-l-emerald-500 opacity-60 bg-white dark:bg-slate-900" : 
        isOverdue ? "border-l-red-500 bg-white dark:bg-slate-900" : "border-l-blue-500 bg-white dark:bg-slate-900",
        isHighlighted ? "ring-2 ring-orange-500 border-orange-500 scale-[1.02] z-10" : "border-slate-200 dark:border-slate-700"
      )}
    >
      {/* Drag Handle */}
      <div 
        {...dragHandleProps}
        className="px-2 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-grab active:cursor-grabbing border-r border-slate-100 dark:border-slate-800"
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      <div className="p-4 flex-1 flex flex-col min-w-0 relative">
        <div className="flex items-start gap-3 pr-28">
          <button onClick={() => toggleTask(task)} className="mt-1 transition-transform hover:scale-110 shrink-0">
            {task.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
          </button>
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <h4 className={cn("font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight w-full break-words", task.completed ? "line-through text-slate-400" : "group-hover:text-orange-600")}>
              {task.title}
            </h4>

            {task.description && (
              <div className="mt-2 relative w-full overflow-hidden">
                <div 
                  className={cn(
                    "text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed transition-all duration-300 w-full",
                    "whitespace-pre-wrap break-words [word-break:normal] [overflow-wrap:break-word]",
                    "[&_*]:whitespace-pre-wrap [&_*]:break-words [&_*]:[word-break:normal] [&_*]:[overflow-wrap:break-word]",
                    task.completed && "text-slate-300 dark:text-slate-500 line-through",
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

            <div className="flex items-center gap-2 mt-3">
              {task.dueDate && (
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                  isOverdue ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300"
                )}>
                  {task.dueDate instanceof Timestamp ? format(task.dueDate.toDate(), 'MMM dd') : 'No Date'}
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
      </div>

      {/* Absolute Actions Container */}
      <div className={cn(
        "absolute top-3 right-3 flex items-center gap-1 transition-all p-1.5 rounded-xl border z-20 shadow-lg",
        task.completed ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
        !showConfirmDelete ? "opacity-40 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0" : "opacity-100 translate-y-0"
      )}>
        {!showConfirmDelete ? (
          <>
            <button 
              onClick={() => setEditingTask(task)}
              className="p-1.5 text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 transition-all hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
              title="Edit Task"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-100 dark:bg-slate-800 mx-0.5" />
            <button 
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <button 
              onClick={handleDelete}
              className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase hover:underline"
            >
              Confirm
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
            <button 
              onClick={() => setShowConfirmDelete(false)}
              className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
