import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Edit3, GripVertical, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { NoteType } from '../types';
import { cn } from '../lib/utils';
import { sanitizeRichText } from '../lib/sanitizeHtml';

export function NoteCard({ note, onDelete, onEdit, isHighlighted, dragHandleProps, isDragging }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const noteTitle = String(note.title || '').replace(/\u00a0/g, ' ');
  const noteContent = String(note.content || '');
  const sanitizedContent = sanitizeRichText(noteContent);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const typeColors: Record<NoteType, string> = {
    'Progress': 'text-blue-600 bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
    'Safety': 'text-emerald-600 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    'Delivery': 'text-orange-600 bg-orange-50 border border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50',
    'Meeting': 'text-purple-600 bg-purple-50 border border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50',
    'Issue': 'text-red-600 bg-red-50 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50',
    'RFI': 'text-amber-600 bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
    'Submittal': 'text-cyan-600 bg-cyan-50 border border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/50',
    'Punch List': 'text-rose-600 bg-rose-50 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
    'Daily Report': 'text-indigo-600 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50',
    'General': 'text-slate-500 bg-slate-50 border border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-800',
  };

  let bgClass = note.backgroundColor || 'bg-white dark:bg-slate-900';
  
  // Add dark mode variants for legacy backgrounds
  if (!bgClass.includes('dark:')) {
    if (bgClass === 'bg-white') bgClass = 'bg-white dark:bg-slate-900';
    if (bgClass === 'bg-slate-50') bgClass = 'bg-slate-50 dark:bg-slate-950';
    if (bgClass === 'bg-blue-50') bgClass = 'bg-blue-50 dark:bg-blue-950/20';
    if (bgClass === 'bg-emerald-50') bgClass = 'bg-emerald-50 dark:bg-emerald-950/20';
    if (bgClass === 'bg-orange-50') bgClass = 'bg-orange-50 dark:bg-orange-950/20';
    if (bgClass === 'bg-purple-50') bgClass = 'bg-purple-50 dark:bg-purple-950/20';
    if (bgClass === 'bg-stone-100') bgClass = 'bg-stone-100 dark:bg-stone-900/20';
    if (bgClass === 'bg-amber-50') bgClass = 'bg-amber-50 dark:bg-amber-950/20';
  }

  const handleDelete = async () => {
    await onDelete();
    setShowConfirmDelete(false);
  };

  return (
    <motion.div 
      ref={cardRef}
      layout
      className={cn(
        "border rounded-xl overflow-hidden shadow-sm hover:shadow-md group relative flex !flex-row items-stretch",
        !isDragging && "transition-all",
        bgClass,
        isHighlighted ? "border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] z-10" : "border-slate-200 dark:border-slate-700"
      )}
    >
      {/* Drag Handle */}
      <div 
        {...dragHandleProps}
        className="px-2 flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors cursor-grab active:cursor-grabbing border-r border-slate-900/10 dark:border-white/10 touch-none select-none"
      >
        <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
      </div>

      <div className="p-5 flex-1 flex flex-col h-full relative">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-sm", typeColors[note.type])}>
              {note.type}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-2 py-0.5 rounded border border-white/50 dark:border-slate-700/50">
              {note.date ? format(parseISO(note.date), 'MMM dd, yyyy') : 'No Date'}
            </span>
          </div>
          <div className={cn(
            "flex items-center gap-1 transition-all shrink-0 relative z-20",
            "opacity-100"
          )}>
            {!showConfirmDelete ? (
              <>
                <button 
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit();
                  }} 
                  className="p-1.5 text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-all bg-white/50 backdrop-blur-sm shadow-sm"
                  title="Edit Note"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowConfirmDelete(true);
                  }} 
                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-all bg-white/50 backdrop-blur-sm shadow-sm"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <button 
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete();
                  }}
                  className="text-[10px] font-bold text-red-600 uppercase hover:underline"
                >
                  Confirm
                </button>
                <button 
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowConfirmDelete(false);
                  }}
                  className="text-[10px] font-bold text-slate-400 uppercase hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
        
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-2 group-hover:text-orange-600 transition-colors leading-tight break-words [word-break:normal] [overflow-wrap:break-word] hyphens-none">{noteTitle}</h3>
        
        <div className="relative">
          <div 
            className={cn(
              "text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose prose-slate dark:prose-invert prose-sm max-w-none break-words overflow-hidden transition-all duration-300",
              "hyphens-none text-wrap-pretty whitespace-pre-wrap [word-break:normal] [overflow-wrap:break-word]",
              "[&_*]:whitespace-pre-wrap [&_*]:break-words [&_*]:[word-break:normal] [&_*]:[overflow-wrap:break-word] [&_*]:hyphens-none [&_a]:break-all",
              "[&_*]:dark:!text-slate-300 [&_*]:dark:!bg-transparent",
              !isExpanded && "max-h-[30rem]" 
            )}
            style={!isExpanded ? { maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' } : {}}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
          
          {(noteContent && noteContent.length > 500) && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-4 flex items-center gap-2 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.2em] hover:text-orange-600 transition-all border-t border-slate-900/10 pt-4 w-full"
            >
              <span>{isExpanded ? 'Collapse Documentation' : 'View Full Documentation'}</span>
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.div>
            </button>
          )}
        </div>

        {note.photoUrls && note.photoUrls.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {note.photoUrls.map((url: string, i: number) => (
              <div 
                key={`${note.id}-photo-${i}`}
                className="w-24 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-orange-500 transition-all cursor-zoom-in"
              >
                <img 
                  src={url} 
                  alt={`Site photo ${i+1}`} 
                  className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
