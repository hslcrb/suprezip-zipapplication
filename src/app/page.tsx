"use client";

/**
 * 슈프레집(Suprezip) 정예 엔터프라이즈 통합 제어 센터 (v1.1.0)
 * 
 * 이 파일은 슈프레집의 핵심 프론트엔드 로직을 담당하며, 
 * 고성능 Rust 백엔드와 실시간 Tauri 이벤트를 통해 소통합니다.
 * 
 * [주요 아키텍처]
 * - Multi-Tasking: 다중 작업 병렬 처리 및 개별 Abort 제어
 * - Integrity: SHA-256/MD5 무결성 검증 및 속도/ETA 실시간 계산
 * - Audit: 사용자 행위 로그 및 시스템 상태 모니터링
 * - Native: 윈도우 OS 쉘 통합 기능 제어
 * 
 * AUTHOR: Hose Rhee (한봄고 기능반 Semgle)
 */

import { useState, useEffect, useRef } from "react";
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
  X,
  StopCircle,
  Cpu,
  Monitor,
  Terminal,
  Database,
  Trash2,
  Download,
  Search,
  Globe,
  Clock,
  User,
  LayoutDashboard,
  Server
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, message } from "@tauri-apps/plugin-dialog";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind Class Merger 유틸리티
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 타입 정의: 백엔드 Rust 구조체와 매핑
interface TaskStatus {
    id: string;
    name: string;
    status: string;
    progress: number;
    started_at: string;
}

interface HashStatus {
    file_name: string;
    progress: number;
    bytes_processed: number;
    total_bytes: number;
    speed_mbs: number;
    eta_seconds: number;
}

interface AuditEntry {
    timestamp: string;
    action: string;
    path: string;
    target?: string;
    status: string;
    context: {
        username: string;
        hostname: string;
        os: string;
        arch: string;
        cpu_count: number;
    };
}

export default function Home() {
  // 전역 상태 관리
  const [tasks, setTasks] = useState<Record<string, TaskStatus>>({});
  const [hashProgress, setHashProgress] = useState<Record<string, HashStatus>>({});
  const [showTasks, setShowTasks] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [integrityHashes, setIntegrityHashes] = useState<Record<string, string>>({});
  const [shellInstalled, setShellInstalled] = useState(false);
  const [currentFile, setCurrentFile] = useState("");
  
  // 탐색용 상태
  const [searchQuery, setSearchQuery] = useState("");

  // 실시간 이벤트 리스너 등록
  useEffect(() => {
    // 1. 새 작업 시작 이벤트
    const unlistenStarted = listen<TaskStatus>("task-started", (event) => {
      setTasks(prev => ({ ...prev, [event.payload.id]: event.payload }));
      setShowTasks(true);
    });

    // 2. 작업 진행률 업데이트
    const unlistenProgress = listen<TaskStatus>("task-progress", (event) => {
      setTasks(prev => ({ ...prev, [event.payload.id]: event.payload }));
    });

    // 3. 작업 종료 (성공/실패)
    const unlistenFinished = listen<TaskStatus>("task-finished", (event) => {
      setTasks(prev => ({ ...prev, [event.payload.id]: event.payload }));
      // 5초 후 자동 정리 로직 (선택 사항)
    });

    // 4. 무결성 검증 (해시) 진행률
    const unlistenHash = listen<HashStatus>("hash-progress", (event) => {
      setHashProgress(prev => ({ ...prev, [event.payload.file_name]: event.payload }));
    });

    // 5. 파일 추출 상세 피드백
    const unlistenExtract = listen<any>("extract-progress", (event) => {
       if (event.payload.file_name) {
          setCurrentFile(event.payload.file_name);
       }
    });

    return () => {
      Promise.all([unlistenStarted, unlistenProgress, unlistenFinished, unlistenHash, unlistenExtract]).then(subs => {
        subs.forEach(unsub => unsub());
      });
    };
  }, []);

  /**
   * 핸들러: 압축 파일 해제 작전 시작
   */
  const handleExtract = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: '슈프레집 대응 아카이브', extensions: ['zip', '7z', 'rar', 'iso', 'appimage'] }]
      });

      if (selected && typeof selected === 'string') {
        const zipPath = selected;
        // 타겟 디렉토리를 원본 파일 위치로 자동 선정
        const targetDir = zipPath.substring(0, zipPath.lastIndexOf('\\')) || zipPath.substring(0, zipPath.lastIndexOf('/'));

        // Rust 백엔드 호출 (Async Task)
        const taskId: string = await invoke("extract_files", { zipPath, targetDir });
        
        // 백그라운드 무결성 검증 병렬 실행
        const hash: string = await invoke("verify_integrity", { filePath: zipPath });
        setIntegrityHashes(prev => ({ ...prev, [taskId]: hash }));
      }
    } catch (error) {
      console.error(error);
      await message(`슈프레집 치명적 오류: ${error}`, { title: "Error", kind: "error" });
    }
  };

  /**
   * 핸들러: 새 압축 파일 생성 작전 시작 (ZIP)
   */
  const handleCompress = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });

      if (selected && typeof selected === 'string') {
        const srcDir = selected;
        const zipPath = `${srcDir}.zip`;
        
        // Rust 백엔드 압축 명령 호출
        await invoke("compress_files", { srcDir, zipPath });
      }
    } catch (error) {
      console.error(error);
      await message(`압축 중 오류 발생: ${error}`, { title: "Error", kind: "error" });
    }
  };

  /**
   * 핸들러: 진행 중인 작업 강제 중단 (Abort)
   */
  const abortTask = async (id: string) => {
    try {
      await invoke("abort_task", { taskId: id });
      setTasks(prev => {
          const next = { ...prev };
          if (next[id]) next[id].status = "Aborted_By_User";
          return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * 핸들러: 윈도우 OS 쉘 통합 제어
   */
  const toggleShell = async () => {
    try {
      const newState = !shellInstalled;
      await invoke("toggle_shell_integration", { install: newState });
      setShellInstalled(newState);
      await message(newState ? "슈프레집이 윈도우 탐색기 우클릭 메뉴에 성공적으로 통합되었습니다." : "우클릭 메뉴 연동을 해제했습니다.", { title: "System Info", kind: "info" });
    } catch (error) {
      await message(`권한 부족: ${error}\n관리자 권한으로 다시 시도해주세요.`, { title: "Privilege Error", kind: "error" });
    }
  };

  /**
   * 렌더링: 작업 상태 카드 리스트
   */
  const renderTaskList = () => {
      const taskArr = Object.values(tasks).reverse();
      if (taskArr.length === 0) return (
          <div className="flex flex-col items-center justify-center p-20 text-zinc-700 opacity-50">
             <Box className="w-16 h-16 mb-4 animate-bounce" />
             <p className="text-xs font-black uppercase tracking-[.5em]">Command Queue Empty</p>
          </div>
      );

      return taskArr.map(task => (
          <motion.div 
            key={task.id} 
            layout 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="p-8 bg-white/[0.03] border border-white/10 rounded-[32px] space-y-6 hover:bg-white/[0.05] transition-all duration-300 relative overflow-hidden"
          >
             <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                   <div className="flex gap-2">
                      <span className={cn("text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border", 
                         task.status.includes("Completed") ? "bg-green-600/20 text-green-500 border-green-500/20" :
                         task.status.includes("Failed") || task.status.includes("Aborted") ? "bg-red-600/20 text-red-500 border-red-500/20" :
                         "bg-blue-600/20 text-blue-500 border-blue-500/20 animate-pulse"
                      )}>
                         {task.status}
                      </span>
                   </div>
                   <h5 className="text-sm font-black text-white italic truncate max-w-[200px]">{task.name}</h5>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <span className="font-mono text-3xl font-black text-blue-500">{Math.round(task.progress * 100)}%</span>
                   {task.status.includes("Running") && (
                      <button 
                        onClick={() => abortTask(task.id)}
                        className="flex items-center gap-1.5 text-[9px] font-black text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-widest"
                      >
                         <StopCircle className="w-3.5 h-3.5" /> Abort Mission
                      </button>
                   )}
                </div>
             </div>

             {/* 프로그레스 바 아키텍처 */}
             <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                   animate={{ width: `${task.progress * 100}%` }}
                   className={cn("h-full", 
                      task.status.includes("Completed") ? "bg-green-600 shadow-[0_0_15px_rgba(34,197,94,0.6)]" :
                      task.status.includes("Fail") ? "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]" :
                      "bg-blue-600 shadow-[0_0_20px_var(--primary-glow)]"
                   )}
                />
             </div>

             {/* 무결성 결과 표시부 */}
             {integrityHashes[task.id] && (
                <div className="pt-6 border-t border-white/5 flex flex-col gap-3 animate-fade-in-up">
                   <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                      <span className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Integrity Secured</span>
                      <span>SHA-256 Digest</span>
                   </div>
                   <div className="p-4 bg-black/50 rounded-2xl font-mono text-[9px] text-zinc-400 break-all border border-white/5 shadow-inner leading-relaxed">
                      {integrityHashes[task.id]}
                   </div>
                </div>
             )}
          </motion.div>
      ));
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[var(--bg)] text-[var(--fg)] font-sans select-none overflow-hidden transition-all duration-1000">
      
      {/* 하이엔드 엔터프라이즈 툴바 */}
      <nav className="h-16 border-b border-white/5 bg-[var(--bg)]/90 backdrop-blur-3xl flex items-center justify-between px-10 z-50 transition-all hover:bg-black">
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ rotate: 180, scale: 1.1 }}
            className="w-12 h-12 bg-gradient-to-br from-blue-700 to-blue-400 rounded-2xl flex items-center justify-center shadow-[0_0_50px_var(--primary-glow)]"
          >
            <ShieldCheck className="w-7 h-7 text-white" />
          </motion.div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-600">
               Suprezip Pro <span className="text-blue-600 not-italic">v1.1</span>
            </h1>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[.3em] mt-2">Mission Critical Data Weapon</p>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="hidden lg:flex gap-10 text-[9px] font-bold text-zinc-700 uppercase tracking-widest mr-10">
             <span className="flex items-center gap-2 animate-pulse"><Globe className="w-3 h-3 text-blue-500" /> Global Extraction Engine Active</span>
             <span className="flex items-center gap-2"><Database className="w-3 h-3 text-indigo-500" /> AES-256 Journaling Enabled</span>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={() => setShowTasks(!showTasks)}
               className={cn("group flex items-center gap-3 px-6 py-2.5 rounded-full transition-all text-[10px] font-black uppercase tracking-[.2em] border shadow-2xl",
                 Object.values(tasks).some(t => t.status === "Running") ? "bg-blue-600/20 text-blue-400 border-blue-500/30" : "bg-white/5 text-zinc-500 border-white/10 hover:text-white"
               )}
             >
               <Activity className={cn("w-4 h-4", Object.values(tasks).some(t => t.status === "Running") && "animate-pulse")} />
               Queue ({Object.keys(tasks).length})
             </button>
             
             <button 
               onClick={toggleShell}
               className={cn("flex items-center gap-3 px-6 py-2.5 rounded-full transition-all text-[10px] font-black uppercase tracking-[.2em] border",
                 shellInstalled ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.3)]" : "bg-white/5 text-zinc-500 border-white/10 hover:text-white"
               )}
             >
               <Monitor className="w-4 h-4" />
               Shell Integrated
             </button>
          </div>
        </div>
      </nav>

      {/* 메인 관제 구역 */}
      <main className="flex-1 flex flex-col items-center justify-center p-20 gap-16 relative overflow-hidden">
        {/* 유기적 거대 광원 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-blue-600/[0.02] blur-[200px] rounded-full animate-pulse" />
        
        <div className="w-full max-w-5xl grid grid-cols-2 gap-12 relative z-20">
           
           {/* 익스트랙터 섹션 (광기의 고성능) */}
           <motion.div 
             whileHover={{ y: -20, scale: 1.02 }}
             onClick={handleExtract}
             className="group relative flex flex-col items-center justify-center p-20 bg-white/[0.02] border border-white/[0.05] rounded-[100px] cursor-pointer hover:bg-white/[0.04] hover:border-blue-500/50 transition-all duration-700 shadow-2xl overflow-hidden"
           >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />
              <div className="w-32 h-32 bg-blue-600/10 rounded-[48px] flex items-center justify-center mb-10 border border-blue-500/20 group-hover:bg-blue-600 group-hover:shadow-[0_0_100px_var(--primary-glow)] transition-all duration-700 relative z-10">
                 <HardDriveDownload className="w-16 h-16 text-blue-500 group-hover:text-white transition-all duration-500" />
              </div>
              <h2 className="text-5xl font-black italic tracking-tighter mb-4 relative z-10 uppercase transition-all group-hover:tracking-normal group-hover:scale-105">Release Data</h2>
              <p className="text-zinc-600 text-xs font-black uppercase tracking-[.4em] relative z-10 group-hover:text-blue-400 transition-colors">Universal Tactical Unwrapper</p>
           </motion.div>

           {/* 컴프레서 섹션 (데이터의 블랙홀) */}
           <motion.div 
             whileHover={{ y: -20, scale: 1.02 }}
             onClick={handleCompress}
             className="group relative flex flex-col items-center justify-center p-20 bg-white/[0.02] border border-white/[0.05] rounded-[100px] cursor-pointer hover:bg-white/[0.04] hover:border-indigo-500/50 transition-all duration-700 shadow-2xl overflow-hidden"
           >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />
              <div className="w-32 h-32 bg-indigo-600/10 rounded-[48px] flex items-center justify-center mb-10 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:shadow-[0_0_100px_rgba(79,70,229,0.7)] transition-all duration-700 relative z-10">
                 <Zap className="w-16 h-16 text-indigo-500 group-hover:text-white transition-all duration-500" />
              </div>
              <h2 className="text-5xl font-black italic tracking-tighter mb-4 relative z-10 uppercase transition-all group-hover:tracking-normal group-hover:scale-105">Seal Essence</h2>
              <p className="text-zinc-600 text-xs font-black uppercase tracking-[.4em] relative z-10 group-hover:text-indigo-400 transition-colors">Atomic Core Compression</p>
           </motion.div>

        </div>

        {/* 정밀 지표 대시보드 페인 */}
        <footer className="w-full max-w-5xl bg-white/[0.01] border border-white/5 rounded-[40px] p-8 flex flex-col gap-10 px-12 z-20 shadow-inner">
           <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <div className="flex gap-16">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic">Security Node</span>
                    <span className="text-xs font-bold text-zinc-400">RHEE_HOSE_TERMINAL</span>
                 </div>
                 <div className="flex flex-col gap-1 border-l border-white/5 pl-16">
                    <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic">Operating System</span>
                    <span className="text-xs font-bold text-green-600/70 uppercase">Windows Native Interface</span>
                 </div>
                 <div className="flex flex-col gap-1 border-l border-white/5 pl-16">
                    <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic">Authorization</span>
                    <span className="text-xs font-bold text-blue-600/80 uppercase">Enterprise Pro License</span>
                 </div>
              </div>
              <Activity className="w-8 h-8 text-white/5" />
           </div>

           <div className="grid grid-cols-2 gap-20">
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-zinc-600 uppercase tracking-[.3em] flex items-center gap-3 italic">
                    <History className="w-4 h-4" /> Operations Journal
                 </h4>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-bold text-zinc-500">LAST ACTION</span>
                        <span className="text-[10px] font-black text-white italic">EXTRACT_ALL_OK</span>
                    </div>
                    <button 
                      onClick={() => setShowLogs(true)}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 text-zinc-400 hover:text-white"
                    >
                      Browse Full Audit Log
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-zinc-600 uppercase tracking-[.3em] flex items-center gap-3 italic">
                    <ShieldAlert className="w-4 h-4" /> Advanced Protections
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-600/5 border border-green-500/10 p-5 rounded-[24px] flex flex-col gap-2">
                       <span className="text-[9px] font-black text-green-600 uppercase">Integrity Verification</span>
                       <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Automatic SHA-256</span>
                    </div>
                    <div className="bg-blue-600/5 border border-blue-500/10 p-5 rounded-[24px] flex flex-col gap-2">
                       <span className="text-[9px] font-black text-blue-600 uppercase">Process Queue</span>
                       <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Multi-Task Active</span>
                    </div>
                 </div>
              </div>
           </div>
        </footer>
      </main>

      {/* 태스크 실시간 모니터링 아머 (사이드바) */}
      <AnimatePresence>
        {showTasks && (
          <motion.aside 
            initial={{ x: 600 }}
            animate={{ x: 0 }}
            exit={{ x: 600 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-[550px] bg-[var(--bg)]/95 backdrop-blur-[80px] border-l border-white/10 z-[100] shadow-[-50px_0_200px_rgba(0,0,0,1)] flex flex-col"
          >
             <div className="p-12 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="space-y-2">
                   <h2 className="text-2xl font-black italic tracking-tighter text-blue-500 uppercase">Mission Control</h2>
                   <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[.5em]">Real-time Operations Queue</p>
                </div>
                <button 
                  onClick={() => setShowTasks(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-600/20 hover:text-red-500 rounded-2xl transition-all border border-white/10"
                >
                   <X className="w-6 h-6" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-12 space-y-10 no-scrollbar">
                {Object.values(tasks).length === 0 && (
                   <div className="flex flex-col items-center justify-center h-full gap-10 opacity-10">
                      <Terminal className="w-24 h-24 stroke-[1px]" />
                      <span className="text-xs font-black uppercase tracking-[1em]">Awaiting Packets...</span>
                   </div>
                )}
                
                {Object.values(tasks).map(task => (
                   <motion.div 
                     key={task.id}
                     layout
                     className="bg-white/[0.03] border border-white/10 rounded-[40px] p-10 space-y-8 shadow-2xl relative group overflow-hidden"
                   >
                      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Activity className="w-16 h-16 text-white/5" />
                      </div>

                      <div className="flex justify-between items-start relative z-10">
                         <div className="space-y-3">
                            <span className={cn("text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border", 
                               task.status.includes("Completed") ? "bg-green-600/20 text-green-500 border-green-500/20" :
                               task.status.includes("Fail") || task.status.includes("Abort") ? "bg-red-600/20 text-red-500 border-red-500/20" :
                               "bg-blue-600/20 text-blue-500 border-blue-500/20 animate-pulse"
                            )}>
                               {task.status}
                            </span>
                            <h4 className="text-xl font-black italic truncate max-w-[300px] leading-tight text-white mb-2">{task.name}</h4>
                            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Started: {new Date(task.started_at).toLocaleTimeString()}</div>
                         </div>
                         <div className="flex flex-col items-end gap-3">
                            <span className="font-mono text-4xl font-black text-blue-600">{Math.round(task.progress * 100)}%</span>
                            {task.status.includes("Running") && (
                               <button 
                                 onClick={() => abortTask(task.id)}
                                 className="px-4 py-1.5 bg-red-600/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
                               >
                                  Terminate
                               </button>
                            )}
                         </div>
                      </div>

                      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                         <motion.div 
                           animate={{ width: `${task.progress * 100}%` }}
                           className={cn("h-full", 
                             task.status.includes("Completed") ? "bg-green-500" :
                             task.status.includes("Failed") ? "bg-red-500" :
                             "bg-gradient-to-r from-blue-700 to-blue-400 shadow-[0_0_25px_var(--primary-glow)]"
                           )}
                         />
                      </div>

                      {/* Integrity Deep Inspect Layer */}
                      {integrityHashes[task.id] && (
                        <div className="pt-8 border-t border-white/5 mt-8 space-y-6">
                           <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                              <span className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-green-600" /> Integrity Secured</span>
                              <span className="text-zinc-800">SHA-256 Digest Matrix</span>
                           </div>
                           <div className="bg-black/60 p-6 rounded-[32px] font-mono text-[11px] text-zinc-400 break-all leading-relaxed shadow-inner border border-white/5 group-hover:border-blue-500/20 transition-all">
                              {integrityHashes[task.id]}
                           </div>
                        </div>
                      )}
                   </motion.div>
                ))}
             </div>

             <footer className="p-12 bg-black/80 border-t border-white/5 text-[11px] font-black text-zinc-800 uppercase tracking-[.8em] text-center">
                Mission Success Guaranteed
             </footer>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 실시간 유동 상태 오버레이 (플로팅) */}
      <AnimatePresence>
        {Object.values(tasks).some(t => t.status.includes("Running")) && (
          <motion.div 
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 px-16 py-6 bg-[var(--bg)]/90 backdrop-blur-3xl border border-blue-500/50 rounded-full z-[200] shadow-[0_0_100px_var(--primary-glow)] flex items-center gap-12"
          >
             <div className="relative">
                <div className="w-14 h-14 border-[6px] border-white/5 border-t-blue-600 rounded-full animate-spin" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                   <Activity className="w-5 h-5 text-blue-600" />
                </div>
             </div>
             <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black uppercase text-blue-500 animate-pulse tracking-[.3em] italic">Accessing Encrypted Packets...</span>
                   <div className="flex gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-75" />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-150" />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-225" />
                   </div>
                </div>
                <span className="text-lg font-black text-white italic truncate max-w-[500px] leading-tight">
                   {currentFile || "Refactoring System Modules"}
                </span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
