import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  X, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { parseExcelToRawData, extractTasksWithGemini, type ExtractedTask } from '../services/importService';
import { cn } from '../lib/utils';

interface ScheduleImportModalProps {
  onClose: () => void;
  onImport: (tasks: ExtractedTask[]) => void;
}

type ImportStep = 'upload' | 'processing' | 'review';

export default function ScheduleImportModal({ onClose, onImport }: ScheduleImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setStep('processing');
    setError(null);
    try {
      const rawData = await parseExcelToRawData(selectedFile);
      if (rawData.length === 0) {
        throw new Error("The file appears to be empty.");
      }
      const tasks = await extractTasksWithGemini(rawData);
      setExtractedTasks(tasks);
      setStep('review');
    } catch (err: any) {
      setError(err.message || "Failed to process schedule. Please try a different file.");
      setStep('upload');
    }
  };

  const removeItem = (index: number) => {
    setExtractedTasks(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Tools & Integrations</h2>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Smart Schedule Import</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center py-12"
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-md border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50/30 transition-all group"
                >
                  <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-10 h-10 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 text-center">Drop your schedule here</h4>
                  <p className="text-sm text-slate-500 text-center mb-8 max-w-[280px]">
                    Supports Excel (.xlsx) and CSV exports from P6, Procore, or MS Project.
                  </p>
                  <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Select File
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleFileChange}
                  />
                </div>
                {error && (
                  <div className="mt-6 flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-lg text-sm font-bold animate-shake">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-center">
                  <div>
                    <div className="text-orange-500 font-black text-xl mb-1">01</div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Excel Parsing</p>
                  </div>
                  <div>
                    <div className="text-orange-500 font-black text-xl mb-1">02</div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Extraction</p>
                  </div>
                  <div>
                    <div className="text-orange-500 font-black text-xl mb-1">03</div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Sync</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-orange-200 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                  <Loader2 className="w-20 h-20 text-orange-500 animate-spin relative z-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Analyzing Schedule...</h4>
                <p className="text-slate-500 max-w-sm">
                  Gemini is mapping your column headers to extract activities, due dates, and descriptions.
                </p>
                <div className="mt-8 flex gap-2">
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-0"></div>
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-150"></div>
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-300"></div>
                </div>
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div 
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Extraction Complete</h4>
                      <p className="text-xs text-slate-500 font-medium">We identified {extractedTasks.length} tasks from your file.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setStep('upload')}
                    className="text-[10px] font-black text-slate-400 hover:text-orange-500 uppercase tracking-widest px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-orange-200 transition-all"
                  >
                    Start Over
                  </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {extractedTasks.map((task, idx) => (
                    <div key={`review-${idx}`} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-4 group">
                      <div className="mt-1 w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors uppercase tracking-tight">
                          {task.title}
                        </h5>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          {(task.startDate || task.finishDate || task.dueDate) && (
                            <div className="flex flex-wrap items-center gap-2">
                              {task.startDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-blue-500" />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-blue-50 px-1.5 rounded border border-blue-100">
                                    Start: {task.startDate}
                                  </span>
                                </div>
                              )}
                              {(task.finishDate || task.dueDate) && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-emerald-500" />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-emerald-50 px-1.5 rounded border border-emerald-100">
                                    Finish: {task.finishDate || task.dueDate}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {task.description && (
                            <div className="flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">
                                {task.description}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => removeItem(idx)}
                        className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 sticky bottom-0 bg-white dark:bg-slate-900">
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-800 leading-relaxed">
                      Confirming will add these tasks to your current project. High-frequency updates will reflect immediately in the <span className="font-bold">3-Week Look Ahead</span>.
                    </p>
                  </div>
                  <button 
                    onClick={() => onImport(extractedTasks)}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3 group"
                  >
                    Sync {extractedTasks.length} Activities to Project
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
