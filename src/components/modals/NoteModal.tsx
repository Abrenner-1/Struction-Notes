import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../../lib/firebase';
import ReactQuill from 'react-quill-new';
import { Note } from '../../types';
import { cn } from '../../lib/utils';

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

export function NoteModal({ onClose, projectId, user, initialData, nextPosition, onDelete, onSaved }: { onClose: () => void, projectId: string, user: any, initialData?: Note, nextPosition: number, onDelete?: (id: string) => void, onSaved?: () => void }) {
  const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrls?.[0] || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [backgroundColor, setBackgroundColor] = useState(initialData?.backgroundColor || 'bg-white dark:bg-slate-900');
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const modules = useMemo(() => QUILL_MODULES, []);

  const colors = [
    { name: 'Default', value: 'bg-white dark:bg-slate-900' },
    { name: 'Mist', value: 'bg-slate-50 dark:bg-slate-950' },
    { name: 'Sky', value: 'bg-blue-50 dark:bg-blue-950/20' },
    { name: 'Sage', value: 'bg-emerald-50 dark:bg-emerald-950/20' },
    { name: 'Cream', value: 'bg-orange-50 dark:bg-orange-950/20' },
    { name: 'Lavender', value: 'bg-purple-50 dark:bg-purple-950/20' },
    { name: 'Sand', value: 'bg-stone-100 dark:bg-stone-900/20' },
    { name: 'Paper', value: 'bg-amber-50 dark:bg-amber-950/20' },
  ];
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      alert("Photo is too large. Please select a file smaller than 800KB for site documentation.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const noteData: any = {
      projectId,
      title: formData.get('title'),
      content: content,
      type: formData.get('type'),
      date: formData.get('date'),
      photoUrls: photoUrl ? [photoUrl] : [],
      backgroundColor: backgroundColor,
      ownerId: user?.uid,
      updatedAt: serverTimestamp()
    };

    if (!initialData) {
      noteData.position = nextPosition;
    }

    try {
      if (user.uid === 'guest-123') {
        const localKey = `guest_notes_${projectId}`;
        const existingData = localStorage.getItem(localKey);
        let notesArr: any[] = existingData ? JSON.parse(existingData) : [];
        
        if (initialData) {
          notesArr = notesArr.map(n => n.id === initialData.id ? { ...n, ...noteData } : n);
        } else {
          const newNote = {
            ...noteData,
            id: crypto.randomUUID(),
            createdAt: { toMillis: () => Date.now() } as any
          };
          notesArr = [newNote, ...notesArr];
        }
        localStorage.setItem(localKey, JSON.stringify(notesArr));
        onSaved?.();
      } else {
        if (initialData) {
          await updateDoc(doc(db, 'projects', projectId, 'notes', initialData.id), noteData);
        } else {
          await addDoc(collection(db, 'projects', projectId, 'notes'), {
            ...noteData,
            createdAt: serverTimestamp()
          });
        }
        
        await updateDoc(doc(db, 'projects', projectId), {
          lastEditedBy: user?.displayName || 'Alex Johnson',
          updatedAt: serverTimestamp()
        });
      }

      onClose();
    } catch (err) {
      handleFirestoreError(err, initialData ? 'update' : 'create', `projects/${projectId}/notes`);
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[92vh]"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Site Documentation</h2>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">{initialData ? 'Update Field Note' : 'New Field Note'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors" title="Close">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-4 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Note Title</label>
              <input name="title" required defaultValue={initialData?.title} placeholder="Describe the report or event..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm font-bold text-slate-800 dark:text-slate-200" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Note Display Color</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setBackgroundColor(c.value)}
                    className={cn(
                      "w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center relative shadow-sm",
                      c.value,
                      backgroundColor === c.value ? "border-orange-500 scale-110 shadow-md z-10" : "border-slate-100 dark:border-slate-800 hover:border-slate-300"
                    )}
                    title={c.name}
                  >
                    {backgroundColor === c.value && (
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Note Category</label>
              <select name="type" defaultValue={initialData?.type} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none appearance-none text-sm cursor-pointer">
                {['Progress', 'Safety', 'Delivery', 'Meeting', 'Issue', 'RFI', 'Submittal', 'Punch List', 'Daily Report', 'General'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Observation Date</label>
              <input name="date" type="date" required defaultValue={initialData?.date || format(new Date(), 'yyyy-MM-dd')} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Technical Details</label>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden focus-within:border-orange-500 transition-all flex flex-col">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent}
                placeholder="Enter primary observations, measurements, or status updates..."
                className="quill-editor-standard quill-editor-documentation"
                modules={modules}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ImageIcon className="w-3 h-3 text-orange-500" />
              Evidence Attachment
            </label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center py-4 px-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50/10 transition-all bg-white dark:bg-slate-900 shadow-sm group">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                        <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Upload Photo</p>
                      </>
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-[1px] bg-slate-200" />
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">or</p>
                  <div className="h-10 w-[1px] bg-slate-200" />
                </div>
                <input 
                  type="url"
                  placeholder="Paste URL..." 
                  value={photoUrl.startsWith('data:') ? '' : photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-orange-500 transition-all shadow-sm"
                />
              </div>

              {photoUrl && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md group/preview">
                  <img src={photoUrl} className="w-full h-full object-cover" alt="Preview" onError={() => setPhotoUrl('')} />
                  <button 
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover/preview:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 flex gap-4 sticky bottom-0 bg-white dark:bg-slate-900">
            {initialData && onDelete && !showConfirmDelete && (
              <button 
                type="button" 
                onClick={() => setShowConfirmDelete(true)}
                className="p-3.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            {showConfirmDelete ? (
              <div className="flex-1 flex gap-2 items-center px-4 bg-red-50 rounded-lg border border-red-100">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex-1">Confirm delete?</span>
                <button 
                  type="button"
                  onClick={handleDeleteAction}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-700"
                >
                  Delete
                </button>
                <button 
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3.5 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95">
                  {initialData ? 'Update Note' : 'Record Note'}
                </button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
