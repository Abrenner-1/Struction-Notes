import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Plus, 
  Search, 
  Loader2, 
  X,
  Trash2, 
  Wrench,
  Settings,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Package,
  Wand2,
  ChevronRight,
  ExternalLink,
  Cpu,
  History,
  Download
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { extractEquipmentData } from '../services/omService';
import { cn } from '../lib/utils';
import type { EquipmentOM } from '../types';

interface OMRegisterProps {
  projectId: string;
  user: any;
}

export default function OMRegister({ projectId, user }: OMRegisterProps) {
  const [records, setRecords] = useState<EquipmentOM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOM, setSelectedOM] = useState<EquipmentOM | null>(null);

  // Form State
  const [manualText, setManualText] = useState('');

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_om_${projectId}`);
      if (data) {
        try {
          setRecords(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest om data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'equipment-om'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EquipmentOM)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/equipment-om`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleExtraction = async () => {
    if (!manualText.trim()) return;
    setIsExtracting(true);

    try {
      const aiResult = await extractEquipmentData(manualText);
      
      const newOM: Partial<EquipmentOM> = {
        projectId,
        tagId: aiResult.tagId,
        equipmentName: aiResult.equipmentName,
        manufacturer: aiResult.manufacturer,
        modelNumber: aiResult.modelNumber,
        maintenanceSchedule: aiResult.maintenanceSchedule,
        spareParts: aiResult.spareParts,
        rawManualText: manualText,
        status: 'Draft',
        ownerId: user.uid,
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
      };

      if (user.uid === 'guest-123') {
        const itemWithId = { ...newOM, id: crypto.randomUUID() } as EquipmentOM;
        const updated = [itemWithId, ...records];
        setRecords(updated);
        localStorage.setItem(`guest_om_${projectId}`, JSON.stringify(updated));
      } else {
        await addDoc(collection(db, 'projects', projectId, 'equipment-om'), newOM);
      }

      setShowAddModal(false);
      setManualText('');
    } catch (err) {
      console.error(err);
      alert("AI Extraction failed. Please check the text format and try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const deleteOM = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.uid === 'guest-123') {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      localStorage.setItem(`guest_om_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'equipment-om', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'equipment-om');
    }
  };

  const updateStatus = async (id: string, status: EquipmentOM['status']) => {
    if (user.uid === 'guest-123') {
      const updated = records.map(r => r.id === id ? { ...r, status } : r);
      setRecords(updated);
      localStorage.setItem(`guest_om_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await updateDoc(doc(db, 'projects', projectId, 'equipment-om', id), { status });
    } catch (err) {
      handleFirestoreError(err, 'update', 'equipment-om');
    }
  };

  const filteredRecords = records.filter(r => 
    r.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = (record: EquipmentOM) => {
    const headers = ["Equipment Tag", "Name", "Manufacturer", "Model", "Maintenance Task", "Frequency"];
    const rows = record.maintenanceSchedule.map(task => [
      record.tagId,
      record.equipmentName,
      record.manufacturer,
      record.modelNumber,
      task.task,
      task.frequency
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${record.tagId}_OM_Data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading O&M Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">O&M Data Extractor</h2>
            <p className="text-xs text-slate-500">Automate CMMS data extraction from manuals</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64 shadow-sm"
                />
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Ingest Manual
              </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords.map((record) => (
          <div 
            key={record.id}
            onClick={() => setSelectedOM(record)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                  record.status === 'Approved' ? "bg-emerald-100 text-emerald-700" : 
                  record.status === 'Exported' ? "bg-orange-100 text-orange-700" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}>
                  {record.status}
                </div>
                <button 
                  onClick={(e) => deleteOM(record.id, e)}
                  className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                   <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{record.tagId}: {record.equipmentName}</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{record.manufacturer} | {record.modelNumber}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-orange-500 mb-1">
                         <History className="w-3.5 h-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Maintenance</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{record.maintenanceSchedule.length} Recs</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-orange-500 mb-1">
                         <Package className="w-3.5 h-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Spare Parts</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{record.spareParts.length} Parts</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-400">AI Data Extracted</span>
               </div>
               <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-all group-hover:translate-x-1" />
            </div>
          </div>
        ))}

        {filteredRecords.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 opacity-20" />
             </div>
             <div className="text-center font-bold">
                <p className="text-slate-600 dark:text-slate-400">No O&M Data Records</p>
                <p className="text-xs font-medium">Ingest equipment manuals to automatically build maintenance databases.</p>
             </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOM(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-5xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                  <Cpu className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-2xl uppercase tracking-tight">{selectedOM.tagId}: {selectedOM.equipmentName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedOM.manufacturer} // {selectedOM.modelNumber}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                  onClick={() => exportToCSV(selectedOM)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:bg-slate-950 transition-all"
                 >
                   <Download className="w-4 h-4" /> Export for CMMS
                 </button>
                 <button onClick={() => setSelectedOM(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
                    <X className="w-6 h-6" />
                 </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Maintenance Schedule */}
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-orange-600">
                           <Wrench className="w-5 h-5" />
                           <h4 className="font-black text-xs uppercase tracking-widest">Maintenance Schedule</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase">AI Extracted</span>
                     </div>
                     <div className="space-y-3">
                        {selectedOM.maintenanceSchedule.map((task, i) => (
                          <div key={i} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center group hover:bg-white dark:bg-slate-900 hover:border-orange-200 transition-all">
                             <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{task.task}</p>
                             <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase tracking-widest">{task.frequency}</span>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* Spare Parts */}
                  <div className="space-y-6">
                     <div className="flex items-center gap-2 text-orange-600">
                        <Package className="w-5 h-5" />
                        <h4 className="font-black text-xs uppercase tracking-widest">Recommended Spare Parts</h4>
                     </div>
                     <div className="grid grid-cols-1 gap-2">
                        {selectedOM.spareParts.map((part, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-orange-50/50 border border-orange-100 rounded-2xl group hover:bg-white dark:bg-slate-900 hover:border-orange-300 transition-all">
                             <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{part.name}</span>
                             <code className="px-2 py-1 bg-white dark:bg-slate-900 text-orange-700 rounded-lg text-[10px] font-black border border-orange-100">{part.partNumber}</code>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Manual Source */}
               <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingested Manual Context</h4>
                  <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 italic text-xs text-slate-500 leading-relaxed max-h-48 overflow-y-auto">
                     {selectedOM.rawManualText}
                  </div>
               </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => updateStatus(selectedOM.id, 'Approved')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
                      selectedOM.status === 'Approved' ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-600 hover:text-emerald-600"
                    )}
                  >
                    Approve Data
                  </button>
                  {selectedOM.status === 'Approved' && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready for CMMS Export
                    </span>
                  )}
               </div>
               <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                 System Ref: {selectedOM.id.slice(0,8)}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isExtracting && setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">AI O&M Ingestion</h3>
                  <p className="text-xs text-slate-500">Paste manual text to extract technical specs</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-orange-600">Manual Content (Paste Text)</label>
                <textarea 
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste the equipment specs, maintenance section, or spare parts list from the manual PDF..."
                  className="w-full h-80 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white dark:bg-slate-900 transition-all leading-relaxed font-medium"
                />
              </div>

              <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 border border-orange-100">
                 <Wand2 className="w-5 h-5 text-orange-600 shrink-0" />
                 <div>
                    <p className="text-[11px] text-orange-900 font-bold mb-1">AI Automated Mapping</p>
                    <p className="text-[10px] text-orange-700 leading-relaxed">Gemini will scan the text for maintenance triggers (frequencies, tasks) and part numbering systems to build a structured database.</p>
                 </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)} 
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all"
                disabled={isExtracting}
              >
                Cancel
              </button>
              <button 
                onClick={handleExtraction}
                disabled={isExtracting || !manualText.trim()}
                className={cn(
                  "px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2",
                  isExtracting && "opacity-80"
                )}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Ingest & Extract
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
