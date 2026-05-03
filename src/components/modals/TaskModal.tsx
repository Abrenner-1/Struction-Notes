import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Clock, Calendar, Bell, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../../lib/firebase';
import ReactQuill from 'react-quill-new';
import { Task, ScheduleItem } from '../../types';

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ]
};

export function TaskModal({ onClose, projectId, projectName, user, initialData, nextPosition, onDelete, isScheduleMode = false }: { onClose: () => void, projectId: string, projectName: string, user: any, initialData?: Task | ScheduleItem, nextPosition: number, onDelete?: (id: string) => void, isScheduleMode?: boolean }) {
  const [description, setDescription] = useState(initialData?.description || '');
  const [reminderAt, setReminderAt] = useState((initialData as Task)?.reminderAt ? format((initialData as Task).reminderAt!.toDate(), "yyyy-MM-dd'T'HH:mm") : '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate ? format(initialData.dueDate.toDate(), 'yyyy-MM-dd') : '');
  const [startDate, setStartDate] = useState((initialData as ScheduleItem)?.startDate ? format((initialData as ScheduleItem).startDate!.toDate(), 'yyyy-MM-dd') : '');
  const [finishDate, setFinishDate] = useState((initialData as ScheduleItem)?.finishDate ? format((initialData as ScheduleItem).finishDate!.toDate(), 'yyyy-MM-dd') : '');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const modules = useMemo(() => QUILL_MODULES, []);

  const setPresetReminder = (minutes: number) => {
    if (!dueDate) return;
    const date = new Date(dueDate);
    date.setHours(9, 0, 0, 0);
    const reminderDate = new Date(date.getTime() - minutes * 60000);
    setReminderAt(format(reminderDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleDeleteAction = async () => {
    if (initialData && onDelete) {
      try {
        await onDelete(initialData.id);
        onClose();
      } catch (err) {
        console.error("Delete Error:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const collectionName = isScheduleMode ? 'scheduleItems' : 'tasks';
    
    const baseData: any = {
      projectId,
      title: formData.get('title'),
      division: formData.get('division'),
      subcontractor: formData.get('subcontractor'),
      description: description,
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate + 'T12:00:00')) : null,
      updatedAt: serverTimestamp()
    };

    if (isScheduleMode) {
      baseData.startDate = startDate ? Timestamp.fromDate(new Date(startDate + 'T12:00:00')) : null;
      baseData.finishDate = finishDate ? Timestamp.fromDate(new Date(finishDate + 'T12:00:00')) : null;
      if (baseData.finishDate) {
        baseData.dueDate = baseData.finishDate;
      }
    } else {
      baseData.projectName = projectName;
      baseData.reminderAt = reminderAt ? Timestamp.fromDate(new Date(reminderAt)) : null;
      if (!initialData) {
        baseData.position = nextPosition;
      }
    }

    try {
      if (user.uid === 'guest-123') {
        const localKey = `guest_${collectionName}_${projectId}`;
        const existingData = localStorage.getItem(localKey);
        let itemsArr: any[] = existingData ? JSON.parse(existingData) : [];
        
        if (initialData) {
          itemsArr = itemsArr.map(item => item.id === initialData.id ? { ...item, ...baseData } : item);
        } else {
          const newItem = {
            ...baseData,
            id: crypto.randomUUID(),
            createdAt: { toMillis: () => Date.now() } as any,
            ownerId: user.uid
          };
          if (!isScheduleMode) {
            newItem.completed = false;
          } else {
            newItem.isConverted = false;
          }
          itemsArr = [newItem, ...itemsArr];
        }
        localStorage.setItem(localKey, JSON.stringify(itemsArr));
      } else {
        if (initialData) {
          await updateDoc(doc(db, 'projects', projectId, collectionName, initialData.id), {
            ...baseData,
            ownerId: user?.uid
          });
        } else {
          const createData = {
            ...baseData,
            ownerId: user?.uid,
            createdAt: serverTimestamp()
          };
          if (!isScheduleMode) {
            createData.completed = false;
          } else {
            createData.isConverted = false;
          }
          await addDoc(collection(db, 'projects', projectId, collectionName), createData);
        }

        await updateDoc(doc(db, 'projects', projectId), {
          lastEditedBy: user?.displayName || 'Alex Johnson',
          updatedAt: serverTimestamp()
        });
      }

      onClose();
    } catch (err) {
      handleFirestoreError(err, initialData ? 'update' : 'create', `projects/${projectId}/${collectionName}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-8 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{isScheduleMode ? '3-Week Look Ahead' : 'Task Management'}</h2>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
              {initialData ? (isScheduleMode ? 'Update Schedule Item' : 'Update Deliverable') : (isScheduleMode ? 'Add Schedule Item' : 'Establish New Task')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors" title="Close">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-4 custom-scrollbar">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Title</label>
            <input name="title" required defaultValue={initialData?.title} placeholder={isScheduleMode ? "e.g. Rough-in Coordination" : "e.g. Pre-concrete check-off"} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm transition-all shadow-sm font-bold text-slate-800 dark:text-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Division</label>
              <input name="division" defaultValue={initialData?.division} placeholder="e.g. 03 Concrete" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm transition-all shadow-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subcontractor</label>
              <input name="subcontractor" defaultValue={initialData?.subcontractor} placeholder="e.g. Apex Foundations" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm transition-all shadow-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Instructional Details</label>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden focus-within:border-orange-500 transition-all flex flex-col">
              <ReactQuill 
                theme="snow" 
                value={description} 
                onChange={setDescription}
                placeholder="Include specific site locations or trade contacts..."
                className="quill-editor-standard"
                modules={modules}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {isScheduleMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-blue-500" />
                      Start Date
                    </label>
                    <input 
                      name="startDate" 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-xs font-semibold" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-emerald-500" />
                      Finish Date
                    </label>
                    <input 
                      name="finishDate" 
                      type="date" 
                      value={finishDate}
                      onChange={(e) => {
                        setFinishDate(e.target.value);
                        setDueDate(e.target.value);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-xs font-semibold" 
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-orange-500" />
                    Target Date
                  </label>
                  <input 
                    name="dueDate" 
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-xs font-semibold" 
                  />
                </div>
              )}
            </div>

            {!isScheduleMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Bell className="w-3 h-3 text-orange-500" />
                    Smart Reminder
                  </label>
                  <input 
                    name="reminderAt" 
                    type="datetime-local" 
                    value={reminderAt}
                    onChange={(e) => setReminderAt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-xs font-semibold" 
                  />
                </div>
                
                {dueDate && (
                  <div className="flex flex-wrap gap-2">
                    <button 
                      type="button" 
                      onClick={() => setPresetReminder(0)}
                      className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded hover:bg-orange-100 hover:text-orange-600 transition-colors uppercase"
                    >
                      Set Day Of (9AM)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPresetReminder(1440)}
                      className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded hover:bg-orange-100 hover:text-orange-600 transition-colors uppercase"
                    >
                      1 Day Prior
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-8 flex gap-4 sticky bottom-0 bg-white dark:bg-slate-900">
            {initialData && onDelete && !showConfirmDelete && (
              <button 
                type="button" 
                onClick={() => setShowConfirmDelete(true)}
                className="p-4 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            {showConfirmDelete ? (
              <div className="flex-1 flex gap-2 items-center px-6 bg-red-50 rounded-xl border border-red-100">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex-1">Confirm deletion?</span>
                <button 
                  type="button"
                  onClick={handleDeleteAction}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-700"
                >
                  Delete
                </button>
                <button 
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-6 py-3 text-slate-500 text-xs font-bold uppercase tracking-widest hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button type="button" onClick={onClose} className="flex-1 py-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-500 hover:bg-slate-50 dark:bg-slate-950 transition-all text-xs uppercase tracking-widest">
                  Discard
                </button>
                <button type="submit" className="flex-1 py-4 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg text-xs uppercase tracking-widest">
                  {initialData ? 'Update Record' : (isScheduleMode ? 'Add Item' : 'Create Task')}
                </button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
