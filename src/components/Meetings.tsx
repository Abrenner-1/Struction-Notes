import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  MapPin, 
  FileText, 
  MoreVertical, 
  Trash2, 
  Pencil,
  ArrowRight,
  ChevronRight,
  Clock,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  doc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Meeting } from '../types';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    ['clean']
  ]
};

interface MeetingsProps {
  projectId: string;
  user: any;
}

export default function Meetings({ projectId, user }: MeetingsProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'view'>('view');
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'projects', projectId, 'meetings'),
      orderBy('date', 'desc')
    );

    return onSnapshot(q, (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
    }, (error) => {
      handleFirestoreError(error, 'list', `projects/${projectId}/meetings`);
      setError("Failed to load meetings. You may not have permission.");
    });
  }, [projectId]);

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'meetings', id));
      setMeetingToDelete(null);
    } catch (err: any) {
      console.error("Delete failed:", err);
      const msg = err.message || "Permission denied or network error.";
      setError(`Could not delete: ${msg}`);
      handleFirestoreError(err, 'delete', `projects/${projectId}/meetings/${id}`);
    }
  };

  const handleCreateFollowUp = (parent: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    const followUp: Partial<Meeting> = {
      title: `Follow-up: ${parent.title}`,
      location: parent.location,
      attendees: parent.attendees,
      parentMeetingId: parent.id,
      date: Timestamp.fromDate(new Date()) // Default to now
    };
    setEditingMeeting(followUp as Meeting);
    setModalMode('edit');
    setShowModal(true);
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.attendees.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMeetings = filteredMeetings.reduce((acc, meeting) => {
    // Normalize title to group "Follow-up: Title" with "Title"
    const baseTitle = meeting.title.replace(/^Follow-up:\s+/i, '').trim();
    if (!acc[baseTitle]) acc[baseTitle] = [];
    acc[baseTitle].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  // Sort groups by the date of their latest meeting
  const sortedGroups = (Object.entries(groupedMeetings) as [string, Meeting[]][]).sort((a, b) => {
    const latestA = a[1][0].date.toMillis();
    const latestB = b[1][0].date.toMillis();
    return latestB - latestA;
  });

  return (
    <div className="space-y-6 flex flex-col h-full">
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold shadow-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-sm"
          />
        </div>
        <button 
          onClick={() => {
            setEditingMeeting(null);
            setModalMode('edit');
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Record Meeting
        </button>
      </div>

      <div className="space-y-8 overflow-y-auto custom-scrollbar pb-20 px-1">
        {sortedGroups.map(([baseTitle, group]) => (
          <div key={`meeting-group-${baseTitle}`} className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {group.length > 1 ? `Series: ${baseTitle}` : 'Individual Record'}
              </h2>
              {group.length > 1 && (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {group.length} Sessions
                </span>
              )}
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {group.map((meeting) => (
                <motion.div
                  key={`meeting-item-${meeting.id}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => {
                    setEditingMeeting(meeting);
                    setModalMode('view');
                    setShowModal(true);
                  }}
                  className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-orange-500/50 transition-all cursor-pointer relative"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors truncate text-sm">
                            {meeting.title}
                          </h3>
                          <div className="flex items-center gap-4 text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {format(meeting.date.toDate(), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {format(meeting.date.toDate(), 'p')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-[11px] text-slate-500 break-words">{meeting.attendees || 'No attendees'}</span>
                        </div>
                        {meeting.followUpRequired && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[8px] font-black uppercase tracking-tighter">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Next Step Required
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMeeting(meeting);
                          setModalMode('edit');
                          setShowModal(true);
                        }}
                        title="Edit Minutes"
                        className="p-1.5 hover:bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-500 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleCreateFollowUp(meeting, e)}
                        title="Create Follow-up Meeting"
                        className="p-1.5 hover:bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest border border-transparent hover:border-orange-100"
                      >
                        <ArrowRight className="w-3 h-3" />
                        Follow-up
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMeetingToDelete(meeting.id);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-600 transition-colors"
                        title="Delete Meeting"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {meetings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <ClipboardList className="w-16 h-16 mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Meetings Recorded</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2 italic">
              Start documenting your project coordination by recording your first meeting.
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <MeetingModal 
            projectId={projectId}
            user={user}
            meeting={editingMeeting}
            initialMode={modalMode}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {meetingToDelete && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Meeting?</h3>
                  <p className="text-sm text-slate-500 mt-1">This action cannot be undone and will permanently remove this record.</p>
                </div>
                <div className="flex gap-3 w-full pt-2">
                  <button 
                    onClick={() => setMeetingToDelete(null)}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(meetingToDelete)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MeetingModal({ projectId, user, meeting, initialMode, onClose }: { 
  projectId: string, 
  user: any, 
  meeting: Meeting | null, 
  initialMode: 'view' | 'edit',
  onClose: () => void 
}) {
  const [formData, setFormData] = useState({
    title: meeting?.title || '',
    date: meeting?.date ? format(meeting.date.toDate(), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    location: meeting?.location || '',
    attendees: meeting?.attendees || '',
    minutes: meeting?.minutes || '',
    followUpRequired: meeting?.followUpRequired || false,
    parentMeetingId: meeting?.parentMeetingId || null
  });
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const data = {
        ...formData,
        date: Timestamp.fromDate(new Date(formData.date)),
        projectId,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (meeting?.id) {
        await updateDoc(doc(db, 'projects', projectId, 'meetings', meeting.id), data);
      } else {
        await addDoc(collection(db, 'projects', projectId, 'meetings'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, meeting?.id ? 'update' : 'create', `projects/${projectId}/meetings`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={cn(
          "w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-colors duration-300",
          mode === 'view' ? "bg-[#0f172a] border border-slate-800" : "bg-white dark:bg-slate-900"
        )}
      >
        <div className={cn(
          "p-6 border-b flex items-center justify-between transition-colors",
          mode === 'view' 
            ? "bg-slate-900/50 text-white border-slate-800" 
            : "bg-slate-50/50 border-slate-100 dark:border-slate-800"
        )}>
          <div>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1 italic transition-colors",
              mode === 'view' ? "text-slate-400" : "text-slate-400"
            )}>
              {mode === 'view' ? 'Record Details' : meeting?.id ? 'Edit Minutes' : 'New Entry'}
            </p>
            <h2 className={cn(
              "text-xl font-bold tracking-tight transition-colors",
              mode === 'view' ? "text-white" : "text-slate-800 dark:text-slate-200"
            )}>
              {formData.title || 'Meeting Minutes'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'view' && (
              <button 
                onClick={() => setMode('edit')}
                className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-700 transition-all shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            <button 
              onClick={onClose} 
              className={cn(
                "p-2 rounded-full transition-colors",
                mode === 'view' ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Basic Information</label>
                {mode === 'view' ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      {format(new Date(formData.date), 'EEEE, MMMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="w-4 h-4 text-slate-500" />
                      {format(new Date(formData.date), 'p')}
                    </div>
                    {formData.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        {formData.location}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input 
                      required
                      value={formData.title}
                      onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                      placeholder="Meeting Title" 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm font-semibold" 
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="datetime-local"
                        required
                        value={formData.date}
                        onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" 
                      />
                      <input 
                        value={formData.location}
                        onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                        placeholder="Venue/Location" 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Attendees</label>
                {mode === 'view' ? (
                  <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-sm italic text-slate-300 break-words whitespace-pre-wrap">
                    {formData.attendees || 'No attendees documented.'}
                  </div>
                ) : (
                  <textarea 
                    value={formData.attendees}
                    onChange={e => setFormData(f => ({ ...f, attendees: e.target.value }))}
                    placeholder="Alex (GC), Maria (Owner), Bob (Architect)..." 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 rounded-lg px-4 py-3 outline-none transition-all text-sm h-[100px] resize-none" 
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meeting Minutes & Action Items</label>
            {mode === 'view' ? (
              <div className="p-6 bg-slate-950/30 rounded-2xl border border-slate-800 min-h-[300px] overflow-hidden">
                {formData.minutes ? (
                  <ReactQuill 
                    theme="snow"
                    readOnly={true}
                    modules={{ toolbar: false }}
                    value={formData.minutes}
                    className="meetings-view-only text-slate-200"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic">
                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                    No minutes recorded for this meeting.
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-12">
                <ReactQuill 
                  theme="snow"
                  value={formData.minutes}
                  onChange={val => setFormData(f => ({ ...f, minutes: val }))}
                  modules={QUILL_MODULES}
                  className="bg-white dark:bg-slate-900 rounded-lg border-slate-200 dark:border-slate-700"
                />
              </div>
            )}
          </div>

          {formData.followUpRequired && mode === 'view' && (
            <div className="mt-8 flex items-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100 text-orange-600 text-xs font-bold uppercase tracking-widest">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              Follow-up meeting is flagged as required
            </div>
          )}

          {mode === 'edit' && (
            <div className="mt-8 flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
              <input 
                type="checkbox"
                id="followUp"
                checked={formData.followUpRequired}
                onChange={e => setFormData(f => ({ ...f, followUpRequired: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="followUp" className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                Follow-up meeting required
              </label>
            </div>
          )}
        </div>

        {mode === 'edit' && (
          <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => meeting?.id ? setMode('view') : onClose()}
              className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-200 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Minutes'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

