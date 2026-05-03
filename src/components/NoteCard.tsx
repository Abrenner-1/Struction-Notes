import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Edit3, Image as ImageIcon, ChevronRight, X, Clock, MapPin, GripVertical, FileSpreadsheet, LayoutGrid, CheckCircle2, ChevronDown, Plus, LogOut, Search, Trash, Calendar, FileText, Bell, HardHat, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react';
import { formatDistanceToNow, format, isSameDay, parseISO } from 'date-fns';
import { db, auth, handleFirestoreError, logout } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Task, Note, ProjectPage, Project, NoteType, ScheduleItem } from '../types';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export function NoteCard({ note, onDelete, onEdit, isHighlighted, dragHandleProps }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const typeColors: Record<NoteType, string> = {
    'Progress': 'text-blue-600 bg-blue-50 border border-blue-100',
    'Safety': 'text-emerald-600 bg-emerald-50 border border-emerald-100',
    'Delivery': 'text-orange-600 bg-orange-50 border border-orange-100',
    'Meeting': 'text-purple-600 bg-purple-50 border border-purple-100',
    'Issue': 'text-red-600 bg-red-50 border border-red-100',
    'RFI': 'text-amber-600 bg-amber-50 border border-amber-100',
    'Submittal': 'text-cyan-600 bg-cyan-50 border border-cyan-100',
    'Punch List': 'text-rose-600 bg-rose-50 border border-rose-100',
    'Daily Report': 'text-indigo-600 bg-indigo-50 border border-indigo-100',
    'General': 'text-slate-500 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700',
  };

  let bgClass = note.backgroundColor || 'bg-white dark:bg-slate-900';
  
  // Add dark mode variants for legacy backgrounds
  if (!bgClass.includes('dark:')) {
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
        "border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative flex flex-col",
        bgClass,
        isHighlighted ? "border-orange-500 ring-2 ring-orange-500/20 scale-[1.02] z-10" : "border-slate-200 dark:border-slate-700"
      )}
    >
      <div className="p-5 flex flex-col h-full relative">
        <div {...dragHandleProps} className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all z-20">
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="flex justify-between items-start mb-4 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-sm", typeColors[note.type])}>
              {note.type}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/50 backdrop-blur-sm px-2 py-0.5 rounded border border-white/50">
              {note.date ? format(parseISO(note.date), 'MMM dd, yyyy') : 'No Date'}
            </span>
          </div>
          <div className={cn(
            "flex items-center gap-1 transition-all shrink-0",
            !showConfirmDelete ? "opacity-100 lg:opacity-0 lg:group-hover:opacity-100" : "opacity-100"
          )}>
            {!showConfirmDelete ? (
              <>
                <button 
                  onClick={onEdit} 
                  className="p-1.5 text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-all bg-white/50 backdrop-blur-sm shadow-sm"
                  title="Edit Note"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(true)} 
                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-all bg-white/50 backdrop-blur-sm shadow-sm"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
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
        
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-2 group-hover:text-orange-600 transition-colors leading-tight break-words [overflow-wrap:anywhere]">{note.title}</h3>
        
        <div className="relative">
          <div 
            className={cn(
              "text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose prose-slate prose-sm max-w-none break-words overflow-hidden transition-all duration-300",
              "hyphens-none text-wrap-pretty whitespace-pre-wrap [overflow-wrap:anywhere]",
              !isExpanded && "max-h-[30rem]" 
            )}
            style={!isExpanded ? { maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' } : {}}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content) }}
          />
          
          {(note.content && note.content.length > 500) && (
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
