import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Plus, FileText, CheckCircle2, ChevronRight, Edit3, Trash } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { collection, query, onSnapshot, writeBatch, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, where, Timestamp, orderBy } from 'firebase/firestore';
import { Project, Note, Task, ScheduleItem, NoteType, Meeting } from '../types';
import { ExtractedTask } from '../services/importService';
import ProcurementLog from '../components/ProcurementLog';
import ProjectRegisters from '../components/ProjectRegisters';
import ProjectDashboard from '../components/ProjectDashboard';
import ScheduleImportModal from '../components/ScheduleImportModal';
import Meetings from '../components/Meetings';
import { NoteModal } from '../components/modals/NoteModal';
import { TaskModal } from '../components/modals/TaskModal';
import { ConfirmClearModal } from '../components/modals/ConfirmClearModal';
import { cn } from '../lib/utils';
// Note: We need NoteCard, TaskItem, and ProjectCanvas still.
// Since we haven't extracted them yet, they will temporarily be broken until App.tsx is fully split, 
// or we must import them from App.tsx (which is a circular dependency). 
// For now, let's assume they'll be extracted to components.
import { NoteCard } from '../components/NoteCard';
import { TaskItem } from '../components/TaskItem';
import { ProjectCanvas } from './ProjectCanvas';

export function ProjectView({ project, user, onEditRequest, onDeleteRequest, onBack }: { 
  project: Project, 
  user: any,
  onEditRequest: (p: Project) => void,
  onDeleteRequest: (id: string) => Promise<void> | void,
  onBack: () => void 
}) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'notes' | 'tasks' | 'canvas' | 'procurement' | 'registers' | 'meetings'>('dashboard');
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchNotesQuery, setSearchNotesQuery] = useState('');
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [highlightedProcurementId, setHighlightedProcurementId] = useState<string | null>(null);
  const [highlightedScheduleItemId, setHighlightedScheduleItemId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddScheduleItem, setShowAddScheduleItem] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Clear highlights after a short delay
  useEffect(() => {
    if (highlightedNoteId) {
      const timer = setTimeout(() => setHighlightedNoteId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedNoteId]);

  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => setHighlightedTaskId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  const deleteScheduleItem = async (id: string) => {
    if (user.uid === 'guest-123') {
      setScheduleItems(prev => prev.filter(i => i.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'scheduleItems', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `projects/${project.id}/scheduleItems/${id}`);
    }
  };

  useEffect(() => {
    if (highlightedScheduleItemId) {
      const timer = setTimeout(() => setHighlightedScheduleItemId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedScheduleItemId]);
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType | 'All'>('All');

  useEffect(() => {
    if (!user) return;

    if (user.uid === 'guest-123') {
      // Initialize with some dummy data for guest if empty
      const localNotes = localStorage.getItem(`guest_notes_${project.id}`);
      if (localNotes) setNotes(JSON.parse(localNotes));
      
      const localTasks = localStorage.getItem(`guest_tasks_${project.id}`);
      if (localTasks) setTasks(JSON.parse(localTasks));

      const localSchedule = localStorage.getItem(`guest_schedule_${project.id}`);
      if (localSchedule) setScheduleItems(JSON.parse(localSchedule));
      
      return;
    }

    const notesQ = query(
      collection(db, 'projects', project.id, 'notes')
    );
    const tasksQ = query(
      collection(db, 'projects', project.id, 'tasks')
    );

    const unsubNotes = onSnapshot(notesQ, (snap) => {
      const fetchedNotes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
      // Manual sorting to handle missing position fields gracefully
      fetchedNotes.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
        if (a.position !== undefined) return -1;
        if (b.position !== undefined) return 1;
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0) || 0;
      });
      setNotes(fetchedNotes);
    }, (error) => {
      console.error("Listing Notes Error:", error);
      handleFirestoreError(error, 'list', `projects/${project.id}/notes`);
    });
    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      const fetchedTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      fetchedTasks.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
        if (a.position !== undefined) return -1;
        if (b.position !== undefined) return 1;
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.dueDate?.toMillis() || 0) - (b.dueDate?.toMillis() || 0) || 0;
      });
      setTasks(fetchedTasks);
    }, (error) => {
      console.error("Listing Tasks Error:", error);
      handleFirestoreError(error, 'list', `projects/${project.id}/tasks`);
    });

    const unsubSchedule = onSnapshot(query(
      collection(db, 'projects', project.id, 'scheduleItems'), 
      where('isConverted', '==', false)
    ), (snap) => {
      setScheduleItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem)));
    }, (error) => {
      handleFirestoreError(error, 'list', `projects/${project.id}/scheduleItems`);
    });

    const unsubMeetings = onSnapshot(query(
      collection(db, 'projects', project.id, 'meetings'),
      orderBy('date', 'desc')
    ), (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
    }, (error) => {
      handleFirestoreError(error, 'list', `projects/${project.id}/meetings`);
    });

    return () => {
      unsubNotes();
      unsubTasks();
      unsubSchedule();
      unsubMeetings();
    };
  }, [project.id, user]);

  const onDragEnd = async (result: DropResult, type: 'note' | 'task') => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const sourceItems = type === 'note' ? [...filteredNotes] : [...tasks];
    const [movedItem] = sourceItems.splice(sourceIndex, 1);
    sourceItems.splice(destIndex, 0, movedItem);

    // Update locally for immediate UI feedback
    if (type === 'note') {
      const notePositions = new Map(sourceItems.map((n, i) => [n.id, i]));
      const updatedNotes = notes.map(n => {
        if (notePositions.has(n.id)) {
          return { ...n, position: notePositions.get(n.id) };
        }
        return n;
      }).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      
      setNotes(updatedNotes);
      if (user.uid === 'guest-123') {
        localStorage.setItem(`guest_notes_${project.id}`, JSON.stringify(updatedNotes));
      }
    } else {
      setTasks(sourceItems as Task[]);
      if (user.uid === 'guest-123') {
        localStorage.setItem(`guest_tasks_${project.id}`, JSON.stringify(sourceItems));
      }
    }

    if (user.uid === 'guest-123') return;

    // Persist to Firebase
    try {
      const collectionPath = type === 'note' ? 'notes' : 'tasks';
      const batch = writeBatch(db);
      
      // Only update items that actually need their position changed
      let hasChanges = false;
      sourceItems.forEach((item, index) => {
        if (item.position !== index) {
          batch.update(doc(db, 'projects', project.id, collectionPath, item.id), {
            position: index
          });
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await batch.commit();
      }
    } catch (err) {
      console.error(`Error saving ${type} order:`, err);
    }
  };

  const toggleTask = async (task: Task) => {
    if (user.uid === 'guest-123') {
      const updated = tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t);
      setTasks(updated);
      localStorage.setItem(`guest_tasks_${project.id}`, JSON.stringify(updated));
      return;
    }
    try {
      await updateDoc(doc(db, 'projects', project.id, 'tasks', task.id), {
        completed: !task.completed
      });
    } catch (err) {
      handleFirestoreError(err, 'update', `projects/${project.id}/tasks/${task.id}`);
    }
  };

  const handleBatchImport = async (extractedTasks: ExtractedTask[]) => {
    try {
      const batch = writeBatch(db);
      
      const parseDateStr = (dateStr?: string): Timestamp | null => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          // We use noon local time to avoid any timezone shifts causing day-jumping
          const d = new Date(year, month, day, 12, 0, 0);
          if (!isNaN(d.getTime())) {
            return Timestamp.fromDate(d);
          }
        }
        return null;
      };

      extractedTasks.forEach((task) => {
        // Find existing item by activityId or by title+subcontractor+division
        const existingItem = scheduleItems.find(item => 
          (task.activityId && item.activityId === task.activityId) || 
          (item.title === task.title && item.subcontractor === task.subcontractor && item.division === task.division)
        );

        const startDate = parseDateStr(task.startDate);
        const finishDate = parseDateStr(task.finishDate);
        const dueDate = parseDateStr(task.dueDate) || finishDate;

        if (existingItem) {
          // Update existing item
          batch.update(doc(db, 'projects', project.id, 'scheduleItems', existingItem.id), {
            startDate: startDate,
            finishDate: finishDate,
            dueDate: dueDate,
            activityId: task.activityId || existingItem.activityId || '',
            description: task.description || existingItem.description || '',
            updatedAt: serverTimestamp()
          });
        } else {
          // Create new item
          const newItemRef = doc(collection(db, 'projects', project.id, 'scheduleItems'));
          batch.set(newItemRef, {
            projectId: project.id,
            title: task.title,
            description: task.description || '',
            division: task.division || '',
            subcontractor: task.subcontractor || '',
            activityId: task.activityId || '',
            startDate: startDate,
            finishDate: finishDate,
            dueDate: dueDate,
            ownerId: auth.currentUser?.uid,
            createdAt: serverTimestamp(),
            isConverted: false
          });
        }
      });

      // Update project metadata
      batch.update(doc(db, 'projects', project.id), {
        lastEditedBy: auth.currentUser?.displayName || 'Alex Johnson',
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      setShowImportModal(false);
    } catch (err) {
      console.error("Batch Import Error:", err);
      handleFirestoreError(err, 'write', `projects/${project.id}/scheduleItems`);
    }
  };

  const convertScheduleItemToTask = async (item: ScheduleItem) => {
    try {
      const batch = writeBatch(db);
      
      // Mark as converted
      batch.update(doc(db, 'projects', project.id, 'scheduleItems', item.id), {
        isConverted: true
      });

      // Create task
      const newTaskRef = doc(collection(db, 'projects', project.id, 'tasks'));
      batch.set(newTaskRef, {
        projectId: project.id,
        projectName: project.name,
        title: item.title,
        description: item.description || '',
        division: item.division || '',
        subcontractor: item.subcontractor || '',
        dueDate: item.dueDate || null,
        completed: false,
        ownerId: auth.currentUser?.uid || '',
        createdAt: serverTimestamp(),
        position: tasks.length
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'write', `projects/${project.id}/tasks`);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'notes', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `projects/${project.id}/notes/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'tasks', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `projects/${project.id}/tasks/${id}`);
    }
  };

  const clearLookaheadSchedule = async () => {
    try {
      const batch = writeBatch(db);
      
      // Delete all schedule items (lookahead only)
      scheduleItems.forEach(item => {
        batch.delete(doc(db, 'projects', project.id, 'scheduleItems', item.id));
      });
      
      await batch.commit();
      setShowClearConfirm(false);
    } catch (err) {
      handleFirestoreError(err, 'write', `projects/${project.id}/clear-schedule`);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchNotesQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchNotesQuery.toLowerCase()) ||
      n.type.toLowerCase().includes(searchNotesQuery.toLowerCase());
    const matchesType = selectedNoteType === 'All' || n.type === selectedNoteType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Project Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <button 
            onClick={onBack}
            className="mt-1 p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-orange-500 rounded-lg border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">Active Site</span>
              <p className="text-[10px] font-semibold text-slate-400 border-l border-slate-300 pl-2 uppercase tracking-widest">{project.location}</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">{project.name}</h1>
            <p className="text-slate-500 max-w-xl text-sm leading-relaxed mb-4">
              {project.description || 'Field operations and documentation hub.'}
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onEditRequest(project)}
                className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-orange-500 uppercase tracking-widest transition-colors group"
              >
                <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                Edit Settings
              </button>
              <div className="w-px h-3 bg-slate-200" />
              <button 
                onClick={() => onDeleteRequest(project.id)}
                className="flex items-center gap-2 text-[10px] font-bold text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors group"
              >
                <Trash className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                Delete Project
              </button>
            </div>
          </div>
        </div>
        
        {/* Removed Record Audio button from here to move it into Project Registers */}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
            activeTab === 'dashboard' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          Dashboard
          {activeTab === 'dashboard' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('canvas')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
            activeTab === 'canvas' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          Project Notes
          {activeTab === 'canvas' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
            activeTab === 'tasks' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          Tasks
          {activeTab === 'tasks' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
            activeTab === 'notes' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          Documentation
          {activeTab === 'notes' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('procurement')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
            activeTab === 'procurement' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          Procurement Log
          {activeTab === 'procurement' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('registers')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
            activeTab === 'registers' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          Project Registers
          {activeTab === 'registers' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('meetings')}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
            activeTab === 'meetings' ? "text-slate-900 dark:text-slate-100" : "text-slate-400 hover:text-slate-600 dark:text-slate-400"
          )}
        >
          Meetings
          {activeTab === 'meetings' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500" />}
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {/* Persistent components that should not unmount (like Audio Recorder in Registers) */}
        <div className={cn("h-[calc(100vh-280px)]", activeTab !== 'registers' && "hidden")}>
          <ProjectRegisters 
            project={project}
            user={user}
            tasks={tasks}
            scheduleItems={scheduleItems}
            onToggleTask={toggleTask}
            onEditTask={setEditingTask}
            onDeleteTask={deleteTask}
            onPromoteItem={convertScheduleItemToTask}
            onImportSchedule={() => setShowImportModal(true)}
            onClearData={() => setShowClearConfirm(true)}
            onAddScheduleItem={() => setShowAddScheduleItem(true)}
            onEditScheduleItem={setEditingScheduleItem}
          />
        </div>

        {activeTab === 'dashboard' ? (
          <ProjectDashboard 
            project={project} 
            notes={notes} 
            tasks={tasks} 
            meetings={meetings}
            scheduleItems={scheduleItems}
            user={user}
            onNavigate={(tab, id) => {
              setActiveTab(tab as any);
              if (tab === 'notes' && id) {
                setHighlightedNoteId(id);
                setSearchNotesQuery('');
                setSelectedNoteType('All');
              } else if (tab === 'tasks' && id) {
                setHighlightedTaskId(id);
              } else if (tab === 'procurement' && id) {
                setHighlightedProcurementId(id);
              } else if (tab === 'meetings' && id) {
                // Handle meeting highlight if needed
              }
            }}
          />
        ) : activeTab === 'notes' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-2xl">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Filter field notes..."
                    value={searchNotesQuery}
                    onChange={(e) => setSearchNotesQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="relative w-full sm:w-48 shrink-0">
                  <select
                    value={selectedNoteType}
                    onChange={(e) => setSelectedNoteType(e.target.value as NoteType | 'All')}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-sm appearance-none cursor-pointer pr-10"
                  >
                    <option value="All">All Categories</option>
                    {['Progress', 'Safety', 'Delivery', 'Meeting', 'Issue', 'RFI', 'Submittal', 'Punch List', 'Daily Report', 'General'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <button 
                onClick={() => setShowAddNote(true)}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Note
              </button>
            </div>
            
            {filteredNotes.length > 0 ? (
              <DragDropContext onDragEnd={(result) => onDragEnd(result, 'note')}>
                <Droppable droppableId="notes-list" direction="vertical">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex flex-col gap-6"
                    >
                      {filteredNotes.map((note, index) => (
                        // @ts-ignore
                        <Draggable key={note.id} draggableId={note.id} index={index}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps}>
                              <NoteCard 
                                note={note} 
                                dragHandleProps={provided.dragHandleProps}
                                isHighlighted={highlightedNoteId === note.id}
                                isDragging={snapshot.isDragging}
                                onDelete={() => deleteNote(note.id)} 
                                onEdit={() => setEditingNote(note)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">No site documentation found</p>
                {searchNotesQuery && <p className="text-xs text-slate-300 mt-2">Try adjusting your filter</p>}
              </div>
            )}
          </div>
        ) : activeTab === 'tasks' ? (
          <div className="space-y-6">
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                New Task
              </button>
            </div>
            {tasks.length > 0 ? (
              <DragDropContext onDragEnd={(result) => onDragEnd(result, 'task')}>
                <Droppable droppableId="tasks-list" direction="vertical">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex flex-col gap-4 max-w-3xl"
                    >
                      {tasks.map((task, index) => (
                        // @ts-ignore
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef} 
                              {...provided.draggableProps}
                              className={cn(
                                snapshot.isDragging ? "shadow-2xl z-50 ring-2 ring-orange-500/20 rounded-xl bg-white dark:bg-slate-900" : ""
                              )}
                            >
                              <TaskItem 
                                task={task} 
                                dragHandleProps={provided.dragHandleProps}
                                isHighlighted={highlightedTaskId === task.id}
                                isDragging={snapshot.isDragging}
                                toggleTask={toggleTask} 
                                setEditingTask={setEditingTask} 
                                onDelete={() => deleteTask(task.id)}
                                project={project}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">All tasks cleared</p>
              </div>
            )}
          </div>
        ) : activeTab === 'procurement' ? (
          <div className="h-[calc(100vh-280px)]">
            <ProcurementLog projectId={project.id} highlightedItemId={highlightedProcurementId} user={user} />
          </div>
        ) : activeTab === 'registers' ? (
          null
        ) : activeTab === 'meetings' ? (
          <Meetings projectId={project.id} user={user} />
        ) : (
          <ProjectCanvas projectId={project.id} user={user} />
        )}
      </div>

      {/* Add Modals */}
      <AnimatePresence>
        {showAddNote && (
          <NoteModal 
            onClose={() => setShowAddNote(false)} 
            projectId={project.id} 
            user={user}
            nextPosition={notes.length}
            onDelete={deleteNote}
          />
        )}
        {showAddTask && (
          <TaskModal 
            onClose={() => setShowAddTask(false)} 
            projectId={project.id} 
            projectName={project.name}
            user={user}
            nextPosition={tasks.length}
            onDelete={deleteTask}
          />
        )}
        {editingNote && (
          <NoteModal 
            onClose={() => setEditingNote(null)} 
            projectId={project.id}
            user={user}
            initialData={editingNote}
            nextPosition={0}
            onDelete={deleteNote}
          />
        )}
        {editingTask && (
          <TaskModal 
            onClose={() => setEditingTask(null)} 
            projectId={project.id}
            projectName={project.name}
            user={user}
            initialData={editingTask}
            nextPosition={0}
            onDelete={deleteTask}
          />
        )}
        {showImportModal && (
          <ScheduleImportModal 
            onClose={() => setShowImportModal(false)}
            onImport={handleBatchImport}
          />
        )}
        {showAddScheduleItem && (
          <TaskModal 
            isScheduleMode
            onClose={() => setShowAddScheduleItem(false)} 
            projectId={project.id} 
            projectName={project.name}
            user={user}
            nextPosition={0}
          />
        )}
        {editingScheduleItem && (
          <TaskModal 
            isScheduleMode
            onClose={() => setEditingScheduleItem(null)} 
            projectId={project.id} 
            projectName={project.name}
            user={user}
            initialData={editingScheduleItem}
            nextPosition={0}
            onDelete={deleteScheduleItem}
          />
        )}
        {showClearConfirm && (
          <ConfirmClearModal 
            onClose={() => setShowClearConfirm(false)}
            onConfirm={clearLookaheadSchedule}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
