import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Download, AlertCircle, Volume2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// removed lamejs import since we're using native recording now for stability

export default function AudioMixerRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isEncoding, setIsEncoding] = useState(false);
  const [isCapturingSystem, setIsCapturingSystem] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const mp3ChunksRef = useRef<Int8Array[]>([]);
  const timerRef = useRef<number | null>(null);

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    setError(null);
    setAudioUrl(null);
    mp3ChunksRef.current = [];
    setRecordingTime(0);

    try {
      // 1. Initialize Worker
      const worker = new Worker(new URL('../services/mp3Worker.ts', import.meta.url), {
        type: 'module'
      });
      
      worker.onmessage = (e) => {
        const { type, data } = e.data;
        if (type === 'DATA') {
          mp3ChunksRef.current.push(data);
        } else if (type === 'DONE') {
          finalizeRecording();
        }
      };
      workerRef.current = worker;

      // 2. Initialize Audio Context
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextCtor();
      audioContextRef.current = ctx;

      // 3. Prompt for microphone
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = micStream;

      // 4. Prompt for system audio
      let systemStream: MediaStream | null = null;
      try {
        systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 },
          audio: true
        });
        systemStreamRef.current = systemStream;
        setIsCapturingSystem(true);
      } catch (sysErr) {
        console.warn("System audio capture cancelled or not supported", sysErr);
        setIsCapturingSystem(false);
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // 5. Connect Streams
      const micSource = ctx.createMediaStreamSource(micStream);
      const merger = ctx.createChannelMerger(2);
      
      micSource.connect(merger, 0, 0);
      micSource.connect(merger, 0, 1);

      if (systemStream && systemStream.getAudioTracks().length > 0) {
        const systemSource = ctx.createMediaStreamSource(systemStream);
        systemSource.connect(merger, 0, 0);
        systemSource.connect(merger, 0, 1);
        systemStream.getVideoTracks().forEach(track => track.stop());
        
        systemStream.getAudioTracks()[0].onended = () => {
          stopRecording();
        };
      }

      // 6. Set up MP3 Init
      worker.postMessage({
        type: 'INIT',
        data: {
          channels: 2,
          sampleRate: ctx.sampleRate,
          bitRate: 128
        }
      });

      // 7. Use ScriptProcessor for streaming capture
      const processor = ctx.createScriptProcessor(4096, 2, 2);
      merger.connect(processor);
      processor.connect(ctx.destination);

      processor.onaudioprocess = (e) => {
        if (!workerRef.current) return;
        
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        
        workerRef.current.postMessage({
          type: 'ENCODE',
          data: {
            left: new Float32Array(left),
            right: new Float32Array(right)
          }
        }, [left.buffer, right.buffer] as any);
      };

      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      cleanupResources();
      
      let errorMessage = err.message || "Please grant microphone permissions to capture audio.";
      if (err.name === 'NotAllowedError' || errorMessage.includes('Permission denied')) {
        errorMessage = "Recording setup cancelled. Please ensure you allow microphone access when prompted.";
      }
      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsEncoding(true);
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'FINISH' });
    }
  };

  const finalizeRecording = () => {
    const finalBlob = new Blob(mp3ChunksRef.current, { type: 'audio/mp3' });
    const url = URL.createObjectURL(finalBlob);
    setAudioUrl(url);

    // Auto-download
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    a.download = `Meeting_Recording_${timestamp}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setIsEncoding(false);
    cleanupResources();
  };

  const cleanupResources = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(t => t.stop());
      systemStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      cleanupResources();
    };
  }, []);

  return (
    <>
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isEncoding}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors ${
          isRecording 
            ? 'text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100' 
            : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 hover:bg-slate-50 dark:bg-slate-950'
        } ${isEncoding ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isEncoding ? (
          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
        ) : isRecording ? (
          <>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-xs w-10 text-center">{formatTime(recordingTime)}</span>
            <Square className="w-3 h-3 ml-1 fill-current hover:scale-110 transition-transform" />
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Record Audio</span>
          </>
        )}
      </button>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg shadow-lg border border-red-100 flex items-start gap-3 z-[100] max-w-sm animate-in slide-in-from-bottom-4">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold mb-1">Recording Error</p>
            <p className="text-xs">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
