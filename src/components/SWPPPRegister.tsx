import React, { useState, useEffect, useRef } from 'react';
import { 
  CloudRain, 
  Search, 
  Plus, 
  Loader2, 
  X,
  Trash2, 
  Camera, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Wand2,
  ChevronRight,
  ClipboardList,
  Wind,
  Droplets,
  ArrowUpRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { analyzeSWPPPPhoto } from '../services/swpppService';
import { cn } from '../lib/utils';
import type { SWPPPItem } from '../types';

interface SWPPPRegisterProps {
  projectId: string;
  user: any;
}

export default function SWPPPRegister({ projectId, user }: SWPPPRegisterProps) {
  const [items, setItems] = useState<SWPPPItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SWPPPItem | null>(null);

  // Form State
  const [bmpName, setBmpName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_swppp_${projectId}`);
      if (data) {
        try {
          setItems(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest swppp data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'swppp'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SWPPPItem)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/swppp`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, existingItem?: SWPPPItem) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const activeBmpName = existingItem?.bmpName || bmpName;
        const aiResult = await analyzeSWPPPPhoto(base64, activeBmpName);
        
        const updateData: Partial<SWPPPItem> = {
          lastPhotoUrl: reader.result as string,
          status: aiResult.isCompliant ? 'Compliant' : 'Failure',
          lastAnalysis: aiResult.isCompliant ? 'BMP is functioning as intended.' : aiResult.failureDescription,
          failureDescription: aiResult.isCompliant ? undefined : aiResult.failureDescription,
          lastAnalysisDate: new Date().toISOString().split('T')[0] as any // adding custom field for UI
        };

        if (existingItem) {
          if (user.uid === 'guest-123') {
            const updated = items.map(i => i.id === existingItem.id ? { ...i, ...updateData } : i);
            setItems(updated);
            localStorage.setItem(`guest_swppp_${projectId}`, JSON.stringify(updated));
            setSelectedItem({ ...existingItem, ...updateData } as any);
          } else {
            await updateDoc(doc(db, 'projects', projectId, 'swppp', existingItem.id), updateData);
            setSelectedItem({ ...existingItem, ...updateData } as any);
          }
        } else {
           const newItem: Partial<SWPPPItem> = {
            projectId,
            bmpName: activeBmpName,
            status: aiResult.isCompliant ? 'Compliant' : 'Failure',
            lastPhotoUrl: reader.result as string,
            lastAnalysis: aiResult.isCompliant ? 'Initial inspection: Pass.' : aiResult.failureDescription,
            failureDescription: aiResult.isCompliant ? undefined : aiResult.failureDescription,
            ownerId: user.uid,
            createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
          };

          if (user.uid === 'guest-123') {
            const itemWithId = { ...newItem, id: crypto.randomUUID() } as SWPPPItem;
            setItems([itemWithId, ...items]);
            localStorage.setItem(`guest_swppp_${projectId}`, JSON.stringify([itemWithId, ...items]));
          } else {
            await addDoc(collection(db, 'projects', projectId, 'swppp'), newItem);
          }
          setShowAddModal(false);
          setBmpName('');
        }
      } catch (err) {
        console.error(err);
        alert("AI SWPPP Analysis failed.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.uid === 'guest-123') {
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      localStorage.setItem(`guest_swppp_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'swppp', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'swppp');
    }
  };

  const filteredItems = items.filter(i => 
    i.bmpName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">SWPPP Compliance</h2>
            <p className="text-xs text-slate-500">Monitor BMP performance and EPA compliance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search BMPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:bg-slate-900 focus:border-orange-500 rounded-xl text-sm transition-all w-64 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm shadow-orange-100"
          >
            <Plus className="w-4 h-4" />
            New SWPPP Monitor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                item.status === 'Compliant' ? "bg-emerald-100 text-emerald-700" : 
                item.status === 'Failure' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
              )}>
                {item.status}
              </div>
              <button 
                onClick={(e) => deleteItem(item.id, e)}
                className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                     <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors uppercase text-sm tracking-tight">{item.bmpName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Inspection: {new Date().toLocaleDateString()}</p>
                  </div>
               </div>

               {item.lastPhotoUrl ? (
                 <div className="relative h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={item.lastPhotoUrl} className="w-full h-full object-cover" />
                 </div>
               ) : (
                 <div className="h-24 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-slate-300 gap-1">
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Photos Recorded</span>
                 </div>
               )}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Droplets className="w-8 h-8 opacity-20" />
             </div>
             <div className="text-center font-bold">
                <p className="text-slate-600 dark:text-slate-400">No SWPPP Monitoring Records</p>
                <p className="text-xs font-medium">Add BMPs like Silt Fence or Inlet Protection to start monitoring compliance.</p>
             </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col md:flex-row">
            
            <div className="w-full md:w-1/2 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
               {selectedItem.lastPhotoUrl ? (
                 <img src={selectedItem.lastPhotoUrl} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                   <ImageIcon className="w-16 h-16" />
                   <p className="font-black text-xs uppercase tracking-widest">No Inspection Photos</p>
                 </div>
               )}
               <div className="absolute top-6 left-6 flex flex-col gap-2">
                 <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg",
                    selectedItem.status === 'Compliant' ? "bg-emerald-500 text-white" : 
                    selectedItem.status === 'Failure' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {selectedItem.status}
                  </div>
                  {selectedItem.status === 'Failure' && (
                    <div className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5 shadow-lg border border-rose-100">
                      <Clock className="w-3 h-3" /> Fix within 48h
                    </div>
                  )}
               </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-none mb-1">{selectedItem.bmpName}</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                     Stormwater Compliance Record <Info className="w-3 h-3" />
                   </p>
                 </div>
                 <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="space-y-6 flex-1">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspection Narrative</h4>
                       <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded flex items-center gap-1">
                         <Wand2 className="w-3 h-3" /> AI Analysis
                       </span>
                    </div>
                    <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl italic text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                       {selectedItem.lastAnalysis || 'Upload a photo to start AI monitoring of this BMP.'}
                    </div>
                 </div>

                 {selectedItem.status === 'Failure' && (
                   <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                     <div className="flex items-center gap-2 text-rose-600 mb-1">
                        <ShieldAlert className="w-5 h-5" />
                        <h4 className="font-black text-[10px] uppercase tracking-widest">EPA Correction Window</h4>
                     </div>
                     <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl">
                        <p className="text-xs font-bold text-rose-900 leading-relaxed mb-4">
                          Failure Detected: {selectedItem.failureDescription}
                        </p>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 shadow-sm shadow-rose-100">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Automatic Work Order for PE</span>
                              <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[8px] font-black uppercase tracking-widest">Urgent</span>
                           </div>
                           <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 italic">"Site Labor: Please repair/replace ${selectedItem.bmpName} immediately to maintain SWPPP compliance as per AI analysis of today's photo."</p>
                        </div>
                     </div>
                   </div>
                 )}

                 <div className="pt-6">
                    <input 
                      type="file" 
                      onChange={(e) => handleImageUpload(e, selectedItem)} 
                      id="update-bmp-photo"
                      className="hidden" 
                      accept="image/*" 
                    />
                    <label 
                      htmlFor="update-bmp-photo"
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all cursor-pointer shadow-lg",
                        isAnalyzing ? "bg-slate-100 dark:bg-slate-800 text-slate-400 animate-pulse" : "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100"
                      )}
                    >
                      {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                      {isAnalyzing ? "Analyzing Photo..." : "Update Inspection Photo"}
                    </label>
                 </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden p-8 space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xl text-orange-900">New SWPPP Monitor</h3>
                <p className="text-sm text-slate-500 font-medium font-sans">Setup visual monitoring for a site BMP.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">BMP System Name</label>
                <input 
                  type="text"
                  value={bmpName}
                  onChange={(e) => setBmpName(e.target.value)}
                  placeholder="e.g. Silt Fence (North Perimeter)"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 border border-orange-100">
               <Wand2 className="w-5 h-5 text-orange-600 shrink-0" />
               <p className="text-[11px] text-orange-900 font-bold leading-relaxed">
                 You will capture a photo of the BMP after saving. Gemini will automatically check for damage or EPA violations.
               </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
                <button 
                onClick={() => {
                   const newItem: Partial<SWPPPItem> = {
                    projectId,
                    bmpName,
                    status: 'Compliant',
                    ownerId: user.uid,
                    createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
                   };
                   if (user.uid === 'guest-123') {
                      const itemWithId = { ...newItem, id: crypto.randomUUID() } as SWPPPItem;
                      setItems([itemWithId, ...items]);
                      localStorage.setItem(`guest_swppp_${projectId}`, JSON.stringify([itemWithId, ...items]));
                   } else {
                      addDoc(collection(db, 'projects', projectId, 'swppp'), newItem);
                   }
                   setShowAddModal(false);
                   setBmpName('');
                }}
                disabled={!bmpName}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all disabled:opacity-50 shadow-lg shadow-orange-100"
              >
                Create Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon helper for the ImageIcon since I missed importing it
const ImageIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);
