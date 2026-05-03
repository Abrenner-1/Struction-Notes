import React, { useState, useEffect } from 'react';
import { 
  Library, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Bell, 
  ChevronRight,
  Search,
  Loader2,
  Trash2,
  History,
  Info,
  X
} from 'lucide-react';
import { collection, query, where, addDoc, serverTimestamp, onSnapshot, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { auditDrawingSet } from '../services/drawingService';
import { cn } from '../lib/utils';
import type { Drawing } from '../types';

interface DrawingRegisterProps {
  projectId: string;
  user: any;
}

export default function DrawingRegister({ projectId, user }: DrawingRegisterProps) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [rawInput, setRawInput] = useState('');

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_drawings_${projectId}`);
      if (data) {
        try {
          setDrawings(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest drawing data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'drawings')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDrawings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Drawing)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/drawings`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleAuditAndSync = async () => {
    if (!rawInput.trim()) return;
    setIsAuditing(true);
    try {
      const result = await auditDrawingSet(rawInput, drawings);
      setAuditResult(result);
      
      if (user.uid === 'guest-123') {
        // Simple guest mode update logic
        const newDrawings = [...drawings];
        
        // Mark as superseded
        result.revised.forEach((r: any) => {
          const idx = newDrawings.findIndex(d => d.sheetNumber === r.sheetNumber && d.status === 'Current');
          if (idx !== -1) newDrawings[idx].status = 'Superseded';
        });

        result.deleted.forEach((d: any) => {
          const idx = newDrawings.findIndex(d_orig => d_orig.sheetNumber === d.sheetNumber && d_orig.status === 'Current');
          if (idx !== -1) newDrawings[idx].status = 'Void';
        });

        // Add news
        const toAdd = [...result.added, ...result.revised].map(item => ({
          ...item,
          id: crypto.randomUUID(),
          projectId,
          ownerId: user.uid,
          status: 'Current' as const,
          createdAt: { toMillis: () => Date.now() }
        } as Drawing));

        const updated = [...toAdd, ...newDrawings];
        setDrawings(updated);
        localStorage.setItem(`guest_drawings_${projectId}`, JSON.stringify(updated));
      } else {
        const batch = writeBatch(db);
        
        // Process Added
        for (const item of result.added) {
          const docRef = doc(collection(db, 'projects', projectId, 'drawings'));
          batch.set(docRef, {
            ...item,
            projectId,
            ownerId: user.uid,
            status: 'Current',
            createdAt: serverTimestamp()
          });
        }

        // Process Revised
        for (const item of result.revised) {
          const existing = drawings.find(d => d.sheetNumber === item.sheetNumber && d.status === 'Current');
          if (existing) {
            const oldDocRef = doc(db, 'projects', projectId, 'drawings', existing.id);
            batch.update(oldDocRef, { status: 'Superseded' });
          }
          
          const newDocRef = doc(collection(db, 'projects', projectId, 'drawings'));
          batch.set(newDocRef, {
            ...item,
            projectId,
            ownerId: user.uid,
            status: 'Current',
            createdAt: serverTimestamp()
          });
        }

        // Process Deleted
        for (const item of result.deleted) {
          const existing = drawings.find(d => d.sheetNumber === item.sheetNumber && d.status === 'Current');
          if (existing) {
            const docRef = doc(db, 'projects', projectId, 'drawings', existing.id);
            batch.update(docRef, { status: 'Void' });
          }
        }

        await batch.commit();
      }
      
      setShowAuditModal(false);
      setRawInput('');
    } catch (err) {
      console.error(err);
      alert("Failed to audit drawing set. Check your Gemini API key.");
    } finally {
      setIsAuditing(false);
    }
  };

  const filteredDrawings = drawings.filter(d => 
    d.sheetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.sheetTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.discipline.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // Sort logic (Number part first)
    return a.sheetNumber.localeCompare(b.sheetNumber, undefined, { numeric: true, sensitivity: 'base' });
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading Drawing Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Drawing Log</h2>
            <p className="text-xs text-slate-500">Official Set of Record & Revision History</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64"
            />
          </div>
          <button 
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-all shadow-sm"
          >
            <History className="w-4 h-4" />
            Audit New Set
          </button>
        </div>
      </div>

      {auditResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold">Latest Audit Analysis</h3>
                </div>
                <button onClick={() => setAuditResult(null)} className="text-xs text-slate-400 hover:text-white uppercase tracking-widest font-black">Dismiss</button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-emerald-400">{auditResult.added.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">New Sheets</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-blue-400">{auditResult.revised.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Revised</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-red-400">{auditResult.deleted.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Deleted</div>
                </div>
              </div>

              {auditResult.revised.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Revision Cloud Analysis</h4>
                  {auditResult.revised.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-xl flex items-start gap-3">
                      <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-mono font-bold shrink-0">{item.sheetNumber}</div>
                      <div>
                        <div className="text-sm font-semibold">{item.sheetTitle}</div>
                        <div className="text-xs text-slate-400 mt-1 italic leading-relaxed">"{item.changeSummary}"</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 h-full shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Notification List</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  {auditResult.notificationList.map((note: any, i: number) => (
                    <div key={i} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{note.subcontractor}</span>
                        <span className="text-[10px] text-white px-2 py-0.5 bg-orange-600 rounded-full font-black tracking-tighter">
                          {note.affectedSheets.length} Sheets
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mb-2 leading-tight">Affected: {note.affectedSheets.join(', ')}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium line-clamp-3">{note.reason}</p>
                    </div>
                  ))}
                  {auditResult.notificationList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-medium italic">No sub impacts detected.</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sheet #</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rev</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Discipline</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrawings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    No drawings in the log. Use the 'Audit New Set' to populate.
                  </td>
                </tr>
              ) : (
                filteredDrawings.map((draw) => (
                  <tr key={draw.id} className={cn("hover:bg-slate-50/50 transition-colors group", draw.status !== 'Current' && 'opacity-60 grayscale')}>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {draw.sheetNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{draw.sheetTitle}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{draw.revisionDescription}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{draw.revisionNumber}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{draw.revisionDate}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">{draw.discipline}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-sm",
                        draw.status === 'Current' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        draw.status === 'Superseded' ? 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-100 dark:border-slate-800 italic' :
                        'bg-red-50 text-red-700 border-red-100 line-through'
                      )}>
                        {draw.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       {/* Optional Action Menu */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isAuditing && setShowAuditModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Set of Record Auditor</h3>
                  <p className="text-xs text-slate-500">Compare new revisions against current log</p>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Paste the sheet index from the <strong>Revised Drawing Set</strong>. The AI auditor will detect additions, deletions, and specific changes in revision descriptions (clouds).
                </p>
              </div>

              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Revised Sheet List / Index Content</label>
              <textarea 
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="A101 - Architectural Floor Plan - Rev 4 - 2024-05-12 - Revised partition layout at grid 4..."
                className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white dark:bg-slate-900 transition-all font-mono text-xs leading-relaxed outline-none"
              />
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowAuditModal(false)}
                disabled={isAuditing}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleAuditAndSync}
                disabled={isAuditing || !rawInput.trim()}
                className={cn(
                  "px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2",
                  isAuditing && "opacity-80"
                )}
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Auditing Set...
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4" />
                    Start Auditor
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
