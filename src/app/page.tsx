"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileArchive, 
  UploadCloud, 
  Settings, 
  ChevronRight, 
  Box, 
  Zap, 
  HardDrive, 
  CheckCircle2, 
  List, 
  FileCode, 
  HardDriveDownload, 
  ShieldCheck, 
  AlertCircle,
  Activity,
  ShieldAlert,
  ChevronDown,
  ExternalLink,
  History,
  X
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, message } from "@tauri-apps/plugin-dialog";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TaskStatus {
    id: string;
    name: string;
    status: string;
    progress: number;
}

interface ProgressPayload {
    file_name: String;
    progress: number;
    current_file: number;
    total_files: number;
}

export default function Home() {
  const [tasks, setTasks] = useState<Record<string, TaskStatus>>({});
  const [currentFile, setCurrentFile] = useState("");
  const [showTasks, setShowTasks] = useState(false);
  const [integrityHashes, setIntegrityHashes] = useState<Record<string, string>>({});
  const [shellInstalled, setShellInstalled] = useState(false);

  useEffect(() => {
    // Listen for Multi-tasking Queue events
    const unlistenStarted = listen<TaskStatus>("task-started", (event) => {
      setTasks(prev => ({ ...prev, [event.payload.id]: event.payload }));
      setShowTasks(true);
    });

    const unlistenProgress = listen<TaskStatus>("task-progress", (event) => {
      setTasks(prev => ({ ...prev, [event.payload.id]: event.payload }));
    });

    const unlistenFinished = listen<TaskStatus>("task-finished", (event) => {
      setTasks(prev => ({ ...prev, [event.payload.id]: event.payload }));
      setTimeout(() => {
        // Optional: Remove finished tasks after some time
      }, 5000);
    });

    // Detailed extraction progress per file
    const unlistenDetail = listen<ProgressPayload>("extract-progress", (event) => {
      setCurrentFile(String(event.payload.file_name));
    });

    return () => {
      Promise.all([unlistenStarted, unlistenProgress, unlistenFinished, unlistenDetail]).then(subs => {
        subs.forEach(unsub => unsub());
      });
    };
  }, []);

  const handleExtract = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Enterprise Archives', extensions: ['zip', '7z', 'rar', 'iso', 'appimage'] }]
      });

      if (selected && typeof selected === 'string') {
        const zipPath = selected;
        const targetDir = zipPath.substring(0, zipPath.lastIndexOf('\\')) || zipPath.substring(0, zipPath.lastIndexOf('/'));

        // Start task and get the ID
        const taskId: string = await invoke("extract_files", { zipPath, targetDir });
        
        // After starting, we can also verify integrity in background
        const hash: string = await invoke("verify_integrity", { filePath: zipPath });
        setIntegrityHashes(prev => ({ ...prev, [taskId]: hash }));
      }
    } catch (error) {
      console.error(error);
      await message(`추출 오류: ${error}`, { title: "Error", kind: "error" });
    }
  };

  const handleCompress = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });

      if (selected && typeof selected === 'string') {
        const srcDir = selected;
        const zipPath = `${srcDir}.zip`;
        await invoke("compress_files", { srcDir, zipPath });
      }
    } catch (error) {
      console.error(error);
      await message(`압축 오류: ${error}`, { title: "Error", kind: "error" });
    }
  };

  const toggleShell = async () => {
    try {
      const newState = !shellInstalled;
      await invoke("toggle_shell_integration", { install: newState });
      setShellInstalled(newState);
      await message(newState ? "윈도우 우클릭 메뉴가 등록되었습니다." : "우클릭 메뉴가 제거되었습니다.", { title: "System", kind: "info" });
    } catch (error) {
      await message(`권한 오류: ${error}`, { title: "Unauthorized", kind: "error" });
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[var(--bg)] text-[var(--fg)] font-sans select-none overflow-hidden transition-colors duration-500">
      
      {/* 고도화된 엔터프라이즈 헤더 */}
      <header className="h-14 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur-2xl flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-[0_0_30px_var(--primary-glow)]">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-tighter text-lg leading-none uppercase italic">Suprezip Pro V4</span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Enterprise Defensive Utility</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTasks(!showTasks)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-xs font-black uppercase tracking-widest border border-white/5"
          >
            <Activity className={cn("w-4 h-4", Object.keys(tasks).length > 0 && "animate-pulse text-blue-500")} />
            <span>Tasks ({Object.keys(tasks).length})</span>
          </button>
          <button onClick={toggleShell} className={cn("flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs font-black uppercase tracking-widest", shellInstalled ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-zinc-500 border border-white/5")}>
             <Settings className="w-4 h-4" />
             <span>Shell Menu</span>
          </button>
        </div>
      </header>

      {/* 메인 작전 센터 */}
      <main className="flex-1 flex flex-col items-center justify-center p-12 gap-12 relative overflow-hidden">
        {/* 다이나믹 유기적 배경 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--primary)]/5 blur-[200px] rounded-full animate-pulse" />
        
        <div className="w-full max-w-3xl grid grid-cols-2 gap-10 relative z-10">
          
          <motion.div 
            whileHover={{ y: -12 }}
            onClick={handleExtract}
            className="group relative flex flex-col items-center justify-center p-14 bg-white/[0.04] border border-white/10 rounded-[60px] cursor-pointer hover:bg-white/[0.06] hover:border-blue-500/50 transition-all duration-500 shadow-2xl"
          >
            <div className="w-24 h-24 bg-blue-600/20 rounded-[32px] flex items-center justify-center mb-8 border border-blue-500/30 group-hover:bg-blue-600 group-hover:shadow-[0_0_60px_var(--primary-glow)] transition-all duration-700">
              <HardDriveDownload className="w-12 h-12 text-blue-500 group-hover:text-white" />
            </div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter">데이터 전면 해제</h3>
            <p className="text-zinc-500 text-sm text-center leading-relaxed font-bold uppercase tracking-wider">Universal Decryption Engine</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -12 }}
            onClick={handleCompress}
            className="group relative flex flex-col items-center justify-center p-14 bg-white/[0.04] border border-white/10 rounded-[60px] cursor-pointer hover:bg-white/[0.06] hover:border-indigo-500/50 transition-all duration-500 shadow-2xl"
          >
            <div className="w-24 h-24 bg-indigo-600/20 rounded-[32px] flex items-center justify-center mb-8 border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:shadow-[0_0_60px_rgba(79,70,229,0.7)] transition-all duration-700">
              <Zap className="w-12 h-12 text-indigo-500 group-hover:text-white" />
            </div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter">데이터 본질 밀봉</h3>
            <p className="text-zinc-500 text-sm text-center leading-relaxed font-bold uppercase tracking-wider">Military Encryption Matrix</p>
          </motion.div>

        </div>

        {/* 무결성 상태바 */}
        <div className="w-full max-w-3xl bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 flex items-center justify-between px-8 text-xs font-black tracking-widest text-zinc-500">
           <div className="flex gap-8">
              <span className="flex items-center gap-2 uppercase"><ShieldAlert className="w-4 h-4 text-green-500" /> 무결성 검증 엔진 활성</span>
              <span className="flex items-center gap-2 uppercase"><Activity className="w-4 h-4 text-blue-500" /> 멀티태스킹 큐 Ready</span>
           </div>
           <div className="flex gap-8">
              <span className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors uppercase"><History className="w-4 h-4" /> Audit Logs</span>
              <span className="uppercase text-blue-600 opacity-50">Secure Mode</span>
           </div>
        </div>
      </main>

      {/* 태스크 사이드바 / 모달 */}
      <AnimatePresence>
        {showTasks && (
          <motion.div 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-20 right-8 bottom-8 w-96 bg-[var(--bg)]/90 backdrop-blur-3xl border border-white/10 rounded-3xl z-50 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
             <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h4 className="font-black uppercase tracking-widest flex items-center gap-3">
                   <Activity className="w-4 h-4 text-blue-500" /> Active Operations
                </h4>
                <button onClick={() => setShowTasks(false)} className="hover:bg-white/5 p-1 rounded">
                   <X className="w-4 h-4" />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {Object.values(tasks).length === 0 && (
                   <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs font-bold uppercase tracking-[0.2em] gap-4">
                      <Box className="w-8 h-8 opacity-20" />
                      No Active Missions
                   </div>
                )}
                {Object.values(tasks).map((task) => (
                   <div key={task.id} className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-start">
                         <div className="space-y-1">
                            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded uppercase", task.status === "Completed" ? "bg-green-600/20 text-green-500" : "bg-blue-600/20 text-blue-500")}>
                               {task.status}
                            </span>
                            <h5 className="text-xs font-black truncate max-w-[200px]">{task.name}</h5>
                         </div>
                         <span className="font-mono text-xs font-black text-blue-500">{Math.round(task.progress * 100)}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                            animate={{ width: `${task.progress * 100}%` }}
                            className="h-full bg-blue-600 shadow-[0_0_10px_var(--primary-glow)]"
                         />
                      </div>
                      {integrityHashes[task.id] && (
                        <div className="pt-2 border-t border-white/5 mt-2">
                           <div className="text-[8px] text-zinc-600 font-black uppercase mb-1">SHA-256 Digest</div>
                           <div className="font-mono text-[9px] text-zinc-400 break-all bg-black/40 p-2 rounded leading-tight">
                              {integrityHashes[task.id]}
                           </div>
                        </div>
                      )}
                   </div>
                ))}
             </div>
             
             <div className="p-6 bg-black/40 border-t border-white/5 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center">
                All data packets encrypted & audited
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 실시간 하단 오버레이 (간소화됨) */}
      <AnimatePresence>
        {Object.values(tasks).some(t => t.status === "Running") && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-[var(--primary)] border border-white/20 rounded-full z-[100] shadow-[0_0_50px_var(--primary-glow)] flex items-center gap-6"
          >
             <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-white/70 italic">Processing Data Stream</span>
                <span className="text-xs font-black text-white truncate max-w-[300px]">{currentFile || "Analyizing Modules..."}</span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
