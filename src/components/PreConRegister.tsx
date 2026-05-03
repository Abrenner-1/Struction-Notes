import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { generatePreConAgenda } from '../services/preConService';
import { cn } from '../lib/utils';
import type { PreInstallationMeeting } from '../types';

interface PreConRegisterProps {
  projectId: string;
  user: any;
}

export default function PreConRegister({ projectId, user }: PreConRegisterProps) {
  const [meetings, setMeetings] = useState<PreInstallationMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<PreInstallationMeeting | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [specSection, setSpecSection] = useState('');
  const [submittalRef, setSubmittalRef] = useState('');
  const [subcontractor, setSubcontractor] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_precon_${projectId}`);
      if (data) {
        try {
          setMeetings(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest precon data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'projects', projectId, 'precon'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMeetings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PreInstallationMeeting)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/precon`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleCreateMeeting = async () => {
    if (!title || !specSection || !subcontractor) return;
    setIsGenerating(true);

    try {
      const agenda = await generatePreConAgenda(specSection, submittalRef || 'No specific submittal ref provided');
      
      const newMeeting: Partial<PreInstallationMeeting> = {
        projectId,
        title,
        specSection,
        submittalRef,
        subcontractor,
        meetingDate,
        agenda,
        status: 'Scheduled',
        ownerId: user.uid,
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
      };

      if (user.uid === 'guest-123') {
        const itemWithId = { ...newMeeting, id: crypto.randomUUID() } as PreInstallationMeeting;
        const updated = [...meetings, itemWithId];
        setMeetings(updated);
        localStorage.setItem(`guest_precon_${projectId}`, JSON.stringify(updated));
      } else {
        await addDoc(collection(db, 'projects', projectId, 'precon'), newMeeting);
      }

      setShowAddModal(false);
      setTitle('');
      setSpecSection('');
      setSubmittalRef('');
      setSubcontractor('');
    } catch (err) {
      console.error(err);
      alert("AI Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteMeeting = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.uid === 'guest-123') {
      const updated = meetings.filter(m => m.id !== id);
      setMeetings(updated);
      localStorage.setItem(`guest_precon_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'precon', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'precon');
    }
  };

  const toggleStatus = async (meeting: PreInstallationMeeting, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = meeting.status === 'Completed' ? 'Scheduled' : 'Completed';
    
    if (user.uid === 'guest-123') {
      const updated = meetings.map(m => m.id === meeting.id ? { ...m, status: newStatus } : m);
      setMeetings(updated);
      localStorage.setItem(`guest_precon_${projectId}`, JSON.stringify(updated));
      return;
    }

    try {
      await updateDoc(doc(db, 'projects', projectId, 'precon', meeting.id), { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, 'update', 'precon');
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subcontractor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading Pre-Con Meetings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Pre-Installation Alignment</h2>
            <p className="text-xs text-slate-500">Coordinate specs and submittals before field work</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-all shadow-sm shadow-orange-200"
          >
            <Plus className="w-4 h-4" />
            New Pre-Con
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMeetings.map((meeting) => (
          <div 
            key={meeting.id}
            onClick={() => setSelectedMeeting(meeting)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                  meeting.status === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                )}>
                  {meeting.status}
                </div>
                <button 
                  onClick={(e) => deleteMeeting(meeting.id, e)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors mb-1">{meeting.title}</h3>
              <p className="text-xs text-slate-500 mb-4">{meeting.subcontractor}</p>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  {new Date(meeting.meetingDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  Spec: {meeting.specSection}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[10px] font-bold text-slate-400">AI Agenda Generated</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-all group-hover:translate-x-1" />
            </div>
          </div>
        ))}

        {filteredMeetings.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 opacity-20" />
             </div>
             <div className="text-center">
                <p className="font-bold text-slate-600 dark:text-slate-400">No Pre-Installation Meetings</p>
                <p className="text-xs max-w-xs mx-auto">Create checklists from specs and submittals to ensure your field crews are aligned with requirements.</p>
             </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedMeeting(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl">{selectedMeeting.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-orange-600 font-bold">
                    <Users className="w-3.5 h-3.5" />
                    {selectedMeeting.subcontractor}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => toggleStatus(selectedMeeting, e)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
                    selectedMeeting.status === 'Completed' 
                      ? "bg-emerald-600 text-white border-emerald-600" 
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600"
                  )}
                >
                  {selectedMeeting.status === 'Completed' ? 'Meeting Completed' : 'Mark Completed'}
                </button>
                <button onClick={() => setSelectedMeeting(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Constraints & Mockups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <h4 className="font-black text-sm uppercase tracking-wider">Critical Constraints</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedMeeting.agenda.criticalConstraints.map((item, i) => (
                      <div key={i} className="p-3 bg-orange-50 text-orange-900 text-xs font-medium rounded-xl border border-orange-100 flex gap-3">
                        <span className="shrink-0 w-5 h-5 bg-orange-200 text-orange-700 rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <h4 className="font-black text-sm uppercase tracking-wider">Mock-up Requirements</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedMeeting.agenda.mockupRequirements.map((item, i) => (
                      <div key={i} className="p-3 bg-orange-50 text-orange-900 text-xs font-medium rounded-xl border border-orange-100 flex gap-3">
                        <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <ClipboardList className="w-5 h-5 shrink-0" />
                    <h4 className="font-black text-sm uppercase tracking-wider">PE 10-Point Checklist</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedMeeting.agenda.checklist.map((item, i) => (
                      <div key={i} className="group p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-white dark:bg-slate-900 hover:border-orange-200 transition-all flex gap-4 items-start">
                        <div className="w-6 h-6 rounded-lg border-2 border-slate-300 group-hover:border-orange-500 shrink-0 mt-0.5 flex items-center justify-center transition-colors">
                           <CheckCircle2 className="w-4 h-4 text-transparent group-hover:text-orange-500" />
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isGenerating && setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">AI Pre-Con Agenda Builder</h3>
                  <p className="text-xs text-slate-500">Analyze specs and submittals for risk alignment</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Meeting Title</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Waterproofing Pre-Con"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Meeting Date</label>
                  <input 
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Subcontractor</label>
                  <input 
                    type="text"
                    value={subcontractor}
                    onChange={(e) => setSubcontractor(e.target.value)}
                    placeholder="e.g. ABC Drywall"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Submittal Ref (Optional)</label>
                  <input 
                    type="text"
                    value={submittalRef}
                    onChange={(e) => setSubmittalRef(e.target.value)}
                    placeholder="e.g. SUB-071000-01"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1 text-orange-600">Spec Section text (Paste Here)</label>
                <textarea 
                  value={specSection}
                  onChange={(e) => setSpecSection(e.target.value)}
                  placeholder="Paste the technical requirements or spec text here for AI analysis..."
                  className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white dark:bg-slate-900 transition-all text-sm outline-none leading-relaxed"
                />
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[11px] text-orange-800 leading-relaxed font-bold">
                  AI will analyze this text to extract temperature constraints, substrate requirements, and mock-up criteria.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)} 
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateMeeting}
                disabled={isGenerating || !specSection || !title}
                className={cn(
                  "px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2",
                  isGenerating && "opacity-80"
                )}
              >
                {isGenerating ? (
                   <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing & Building Agenda...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Build Pre-Con Agenda
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
