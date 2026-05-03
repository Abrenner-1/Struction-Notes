import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  AlertTriangle,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Tag,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { checkCompliance } from '../services/complianceService';
import { cn } from '../lib/utils';
import type { SubcontractorCompliance } from '../types';

interface ComplianceRegisterProps {
  projectId: string;
  user: any;
}

export default function ComplianceRegister({ projectId, user }: ComplianceRegisterProps) {
  const [subs, setSubs] = useState<SubcontractorCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [coiDate, setCoiDate] = useState('');
  const [mobDate, setMobDate] = useState('');
  const [signed, setSigned] = useState(false);
  const [safety, setSafety] = useState(false);

  useEffect(() => {
    if (!projectId || !user) return;

    if (user.uid === 'guest-123') {
      const data = localStorage.getItem(`guest_compliance_${projectId}`);
      if (data) {
        try {
          setSubs(JSON.parse(data));
        } catch (e) {
          console.error("Failed to parse guest compliance data", e);
        }
      }
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'projects', projectId, 'compliance'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SubcontractorCompliance)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', `projects/${projectId}/compliance`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleAddSub = async () => {
    if (!name || !email || !coiDate || !mobDate) return;
    setIsChecking(true);
    try {
      const subPayload = {
        subcontractorName: name,
        contactEmail: email,
        coiExpirationDate: coiDate,
        contractSigned: signed,
        safetyPlanApproved: safety,
        mobilizationDate: mobDate,
      };

      const aiResult = await checkCompliance(subPayload);
      
      const newSub: Partial<SubcontractorCompliance> = {
        ...subPayload,
        projectId,
        status: aiResult.suggestedStatus,
        ownerId: user.uid,
        createdAt: user.uid === 'guest-123' ? { toMillis: () => Date.now() } as any : serverTimestamp()
      };

      if (user.uid === 'guest-123') {
        const itemWithId = { ...newSub, id: crypto.randomUUID() } as SubcontractorCompliance;
        const updated = [itemWithId, ...subs];
        setSubs(updated);
        localStorage.setItem(`guest_compliance_${projectId}`, JSON.stringify(updated));
      } else {
        await addDoc(collection(db, 'projects', projectId, 'compliance'), newSub);
      }

      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to analyze compliance.");
    } finally {
      setIsChecking(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setCoiDate('');
    setMobDate('');
    setSigned(false);
    setSafety(false);
  };

  const deleteSub = async (id: string) => {
    if (user.uid === 'guest-123') {
      const updated = subs.filter(s => s.id !== id);
      setSubs(updated);
      localStorage.setItem(`guest_compliance_${projectId}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'compliance', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'compliance');
    }
  };

  const runGatekeeperAnalysis = async (sub: SubcontractorCompliance) => {
    setIsChecking(true);
    try {
      const result = await checkCompliance(sub);
      setSelectedSub({ ...sub, aiAudit: result });
    } catch (err) {
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  const filteredSubs = subs.filter(s => 
    s.subcontractorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.mobilizationDate.localeCompare(b.mobilizationDate));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading Compliance Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Compliance Gatekeeper</h2>
            <p className="text-xs text-slate-500">Cross-referencing docs against mobilization dates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search subcontractors..."
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
            New Subcontractor
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Subcontractors</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{filteredSubs.length}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Fully Compliant</div>
          <div className="text-2xl font-black text-emerald-700">{filteredSubs.filter(s => s.status === 'Compliant').length}</div>
        </div>
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Non-Compliant</div>
          <div className="text-2xl font-black text-red-700">{filteredSubs.filter(s => s.status === 'Non-Compliant').length}</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Expiring Soon</div>
          <div className="text-2xl font-black text-amber-700">{filteredSubs.filter(s => s.status === 'Expiring Soon').length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subcontractor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">COI Exp</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Safety</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Contract</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobilization</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    No subcontractors tracked. Start by adding a sub and their mobilization date.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{sub.subcontractorName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{sub.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={cn(
                        "text-xs font-medium font-mono inline-block px-2 py-1 rounded-lg",
                        new Date(sub.coiExpirationDate) < new Date() ? "bg-red-50 text-red-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}>
                        {sub.coiExpirationDate}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {sub.safetyPlanApproved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                       {sub.contractSigned ? (
                        <Tag className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <Tag className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {sub.mobilizationDate}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => runGatekeeperAnalysis(sub)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-sm transition-all",
                          sub.status === 'Compliant' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          sub.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-red-50 text-red-700 border-red-100 hover:scale-105'
                        )}
                      >
                        {sub.status}
                        {sub.status !== 'Compliant' && <Sparkles className="w-3 h-3 ml-1 animate-pulse" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => deleteSub(sub.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedSub(null)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  selectedSub.aiAudit.isHighPriorityAlert ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  {selectedSub.aiAudit.isHighPriorityAlert ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">{selectedSub.subcontractorName}</h3>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest">{selectedSub.aiAudit.suggestedStatus}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSub(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedSub.aiAudit.isHighPriorityAlert && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-4 animate-in fade-in slide-in-from-top-4">
                  <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800 mb-1">Gatekeeper High Priority Alert</h4>
                    <p className="text-xs text-red-700 leading-relaxed font-medium">{selectedSub.aiAudit.alertReason}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Draft Follow-up Email
                  </h4>
                  <button className="text-[10px] text-orange-600 font-bold hover:underline">Copy Body</button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-mono text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400">Subject:</span> {selectedSub.aiAudit.draftEmail.subject}
                  </div>
                  {selectedSub.aiAudit.draftEmail.body}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedSub(null)}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isChecking && setShowAddModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Add Subcontractor</h3>
                  <p className="text-xs text-slate-500">Enable Gatekeeper monitoring</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Subcontractor Name</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="XYZ Concrete"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Contact Email</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="coordinator@xyz.com"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">COI Expiration</label>
                  <input 
                    type="date"
                    value={coiDate}
                    onChange={(e) => setCoiDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Mobilization Date</label>
                  <input 
                    type="date"
                    value={mobDate}
                    onChange={(e) => setMobDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                  onClick={() => setSigned(!signed)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 border rounded-2xl transition-all",
                    signed ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-400"
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-tight">Contract Signed</span>
                  {signed ? <CheckCircle2 className="w-5 h-5 text-orange-500" /> : <Clock className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setSafety(!safety)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 border rounded-2xl transition-all",
                    safety ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-400"
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-tight">Safety Plan</span>
                  {safety ? <CheckCircle2 className="w-5 h-5 text-orange-500" /> : <Clock className="w-5 h-5" />}
                </button>
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
                onClick={handleAddSub}
                disabled={isChecking || !name || !email}
                className={cn(
                  "px-8 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2",
                  isChecking && "opacity-80"
                )}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Risk...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Save & Check
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
