import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  Target,
  ArrowRight,
  Clock,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { analyzeDailyLog } from '../services/quantityService';
import { cn } from '../lib/utils';
import type { QuantityTracker as TrackerType, DailyLog } from '../types';

interface QuantityTrackerProps {
  projectId: string;
  user: any;
}

export default function QuantityTracker({ projectId, user }: QuantityTrackerProps) {
  const [trackers, setTrackers] = useState<TrackerType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState<string | null>(null);

  // Form State
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('');
  const [totalEst, setTotalEst] = useState('');
  
  // Log Form State
  const [rawLog, setRawLog] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_trackers_${projectId}`);
      if (data) {
        try {
          setTrackers(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest tracker data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'projects', projectId, 'trackers'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrackers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TrackerType)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/trackers`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleAddTracker = async () => {
    if (!itemName || !unit || !totalEst) return;
    
    const newTracker: Partial<TrackerType> = {
      projectId,
      itemName,
      unit,
      totalEstimatedQuantity: parseFloat(totalEst),
      installedQuantity: 0,
      status: 'On Track',
      ownerId: user.uid,
      createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
    };

    if (user.uid === 'guest-123') {
      const itemWithId = { ...newTracker, id: crypto.randomUUID() } as TrackerType;
      const updated = [...trackers, itemWithId];
      setTrackers(updated);
      localStorage.setItem(`guest_trackers_${projectId}`, JSON.stringify(updated));
    } else {
      await addDoc(collection(db, 'projects', projectId, 'trackers'), newTracker);
    }

    setShowAddModal(false);
    setItemName('');
    setUnit('');
    setTotalEst('');
  };

  const handlePostLog = async () => {
    if (!rawLog.trim() || !showLogModal) return;
    setIsAnalyzing(true);
    
    const tracker = trackers.find(t => t.id === showLogModal);
    if (!tracker) return;

    try {
      const aiResult = await analyzeDailyLog(rawLog, tracker);
      
      const logData: Partial<DailyLog> = {
        projectId,
        trackerId: tracker.id,
        installDate: logDate,
        quantity: aiResult.quantity,
        notes: aiResult.notes,
        rawInput: rawLog,
        ownerId: user.uid,
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
      };

      if (user.uid === 'guest-123') {
        const itemWithId = { ...logData, id: crypto.randomUUID() } as DailyLog;
        // In guest mode we just update the local trackers
        const updatedTrackers = trackers.map(t => {
          if (t.id === tracker.id) {
            return { 
              ...t, 
              installedQuantity: t.installedQuantity + aiResult.quantity,
              burnRateInfo: aiResult.burnRateInfo,
              estimatedCompletionDays: aiResult.estimatedCompletionDays,
              status: ((t.installedQuantity + aiResult.quantity) / t.totalEstimatedQuantity >= 1) ? 'Completed' : 'On Track'
            };
          }
          return t;
        });
        setTrackers(updatedTrackers);
        localStorage.setItem(`guest_trackers_${projectId}`, JSON.stringify(updatedTrackers));
        // We don't store logs separately in guest mode for simplicity
      } else {
        const batch = writeBatch(db);
        const logRef = doc(collection(db, 'projects', projectId, 'trackers', tracker.id, 'logs'));
        const trackerRef = doc(db, 'projects', projectId, 'trackers', tracker.id);

        batch.set(logRef, logData);
        batch.update(trackerRef, {
          installedQuantity: increment(aiResult.quantity),
          status: aiResult.percentComplete >= 100 ? 'Completed' : 'On Track',
          burnRateInfo: aiResult.burnRateInfo,
          estimatedCompletionDays: aiResult.estimatedCompletionDays
        });

        await batch.commit();
      }

      setShowLogModal(null);
      setRawLog('');
    } catch (err) {
      console.error(err);
      alert("AI Analysis failed. Check context or log description.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteTracker = async (id: string) => {
    if (user.uid === 'guest-123') {
      const updated = trackers.filter(t => t.id !== id);
      setTrackers(updated);
      localStorage.setItem(`guest_trackers_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'trackers', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'trackers');
    }
  };

  const filteredTrackers = trackers.filter(t => 
    t.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading Quantity Trackers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Yield & Production Tracker</h2>
            <p className="text-xs text-slate-500">Compare field installs against estimates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-all shadow-sm shadow-orange-100"
          >
            <Plus className="w-4 h-4" />
            New Item Tracker
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTrackers.map((track) => {
          const progress = Math.min(Math.round((track.installedQuantity / track.totalEstimatedQuantity) * 100), 100);
          return (
            <div key={track.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors">{track.itemName}</h3>
                    <p className="text-xs text-slate-500">Budget: {track.totalEstimatedQuantity} {track.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => setShowLogModal(track.id)}
                    className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                   >
                    <Plus className="w-4 h-4" />
                   </button>
                   <button 
                    onClick={() => deleteTracker(track.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                   >
                    <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              {/* Progress UI */}
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{track.installedQuantity.toLocaleString()}</span>
                    <span className="text-xs font-bold text-slate-400">/ {track.totalEstimatedQuantity.toLocaleString()} {track.unit}</span>
                  </div>
                  <div className="text-sm font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
                    {progress}%
                  </div>
                </div>

                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 ease-out relative",
                      progress >= 100 ? "bg-emerald-500" : "bg-orange-600"
                    )}
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/20"></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      Status
                    </div>
                    <div className={cn(
                      "text-xs font-bold",
                      track.status === 'On Track' ? 'text-emerald-600' : 
                      track.status === 'Completed' ? 'text-blue-600' : 'text-amber-600'
                    )}>
                      {track.status}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      <History className="w-3 h-3 text-orange-500" />
                      Burn Rate
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis">
                      {track.burnRateInfo || (progress < 100 ? 'Calculating...' : 'Completed')}
                    </div>
                  </div>
                </div>

                {track.estimatedCompletionDays !== undefined && track.status !== 'Completed' && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                      <Clock className="w-3.5 h-3.5" />
                      Forecast: ~{track.estimatedCompletionDays} working days to completion
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredTrackers.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 opacity-20" />
             </div>
             <div className="text-center">
                <p className="font-bold text-slate-600 dark:text-slate-400">No Quantity Trackers</p>
                <p className="text-xs">Create trackers for concrete, steel, pipe, or drywall to start monitoring.</p>
             </div>
             <button 
               onClick={() => setShowAddModal(true)}
               className="mt-2 text-orange-600 text-sm font-bold hover:underline"
              >
               + Create your first tracker
             </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Track Project Item</h3>
                  <p className="text-xs text-slate-500">Define estimates and units</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Item Name</label>
                <input 
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Concrete Footings, Structural Steel"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Unit</label>
                  <input 
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. CY, LF, TONS"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Est. Total Quantity</label>
                  <input 
                    type="number"
                    value={totalEst}
                    onChange={(e) => setTotalEst(e.target.value)}
                    placeholder="1500"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
              <button 
                onClick={handleAddTracker}
                className="px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all"
              >
                Create Tracker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isAnalyzing && setShowLogModal(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-bold text-slate-800 dark:text-slate-200">Post Installation Log</h3>
                   <p className="text-xs text-slate-500">AI extracts quantity from your description</p>
                </div>
              </div>
              <button onClick={() => setShowLogModal(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Install Date</label>
                <input 
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Raw Description of Work</label>
                <textarea 
                  value={rawLog}
                  onChange={(e) => setRawLog(e.target.value)}
                  placeholder="e.g. Poured 150 CY of concrete for the Level 2 deck today. Crew finished at 5 PM."
                  className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white dark:bg-slate-900 transition-all text-sm outline-none"
                />
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[11px] text-orange-800 leading-relaxed font-medium">
                  <strong>AI Analysis:</strong> Gemini will analyze your text to extract the exact quantity and calculate current velocity/forecasts automatically.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
               <button 
                onClick={() => setShowLogModal(null)}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handlePostLog}
                disabled={isAnalyzing || !rawLog.trim()}
                className={cn(
                  "px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2",
                  isAnalyzing && "opacity-80"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Log...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Post Log
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
