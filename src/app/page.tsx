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
  AlertCircle 
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, message } from "@tauri-apps/plugin-dialog";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProgressPayload {
    file_name: String;
    progress: number;
    current_file: number;
    total_files: number;
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [currentFile, setCurrentFile] = useState("");
  const [progress, setProgress] = useState(0);
  const [archiveFiles, setArchiveFiles] = useState<string[]>([]);
  const [showFileList, setShowFileList] = useState(false);

  useEffect(() => {
    const unlisten = listen<ProgressPayload>("extract-progress", (event) => {
      const { file_name, progress: p } = event.payload;
      setCurrentFile(String(file_name));
      setProgress(Math.round(p * 100));
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const handleExtract = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: '모든 아카이브', extensions: ['zip', '7z', 'rar', 'iso', 'appimage'] }]
      });

      if (selected && typeof selected === 'string') {
        const files: string[] = await invoke("list_archive_files", { zipPath: selected });
        setArchiveFiles(files);
        setShowFileList(true);

        setIsProcessing(true);
        setStatusMessage("대상을 정밀 분석하여 해제 중...");
        
        const zipPath = selected;
        const targetDir = zipPath.substring(0, zipPath.lastIndexOf('\\')) || zipPath.substring(0, zipPath.lastIndexOf('/'));

        await invoke("extract_files", { zipPath, targetDir });
        
        setProgress(100);
        setStatusMessage("해제 작전 성공!");
        await message("모든 데이터가 완벽하게 복원되었습니다.", { title: "성공", kind: "info" });
      }
    } catch (error) {
      console.error(error);
      await message(`오류 발생: ${error}`, { title: "오류", kind: "error" });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setShowFileList(false);
      }, 3000);
    }
  };

  const handleCompress = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });

      if (selected && typeof selected === 'string') {
        setIsProcessing(true);
        setStatusMessage("데이터를 고효율로 압축 중...");
        setProgress(50);

        const srcDir = selected;
        const zipPath = `${srcDir}.zip`;

        await invoke("compress_files", { srcDir, zipPath });

        setProgress(100);
        setStatusMessage("압축 작전 완료!");
        await message(`새로운 데이터 병기가 생성되었습니다: ${zipPath}`, { title: "성공", kind: "info" });
      }
    } catch (error) {
      console.error(error);
      await message(`오류 발생: ${error}`, { title: "오류", kind: "error" });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 2000);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[var(--bg)] text-[var(--fg)] font-sans select-none overflow-hidden transition-colors duration-500">
      
      {/* 콤팩트 툴바 헤더 */}
      <header className="h-14 border-b border-white/5 bg-[var(--bg)]/60 backdrop-blur-xl flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shadow-[0_0_20px_var(--primary-glow)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-black tracking-tighter text-lg uppercase bg-clip-text text-transparent bg-gradient-to-r from-[var(--fg)] to-zinc-500">Suprezip Pro</span>
          <div className="flex gap-1">
             <span className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary)] px-1 rounded border border-[var(--primary)]/20 font-bold uppercase tracking-widest">Universal</span>
             <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 rounded">RUST_V3</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-all text-xs font-medium text-zinc-400 hover:text-[var(--fg)] border border-transparent hover:border-white/10">
            <Settings className="w-3.5 h-3.5" />
            <span>본질적 설정</span>
          </button>
        </div>
      </header>

      {/* 메인 작업 영역 */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-10 relative">
        {/* 역동적인 배경 효과 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--primary)]/5 blur-[150px] rounded-full animate-pulse" />
        
        <div className="w-full max-w-2xl grid grid-cols-2 gap-8 relative z-10">
          
          {/* 압축 해제 섹션 (Universal) */}
          <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExtract}
            className="group relative flex flex-col items-center justify-center p-12 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[40px] cursor-pointer hover:bg-[var(--glass-bg)]/20 hover:border-[var(--primary)]/40 transition-all duration-500 shadow-2xl"
          >
            <div className="w-20 h-20 bg-[var(--primary)]/10 rounded-3xl flex items-center justify-center mb-8 border border-[var(--primary)]/20 group-hover:bg-[var(--primary)] group-hover:shadow-[0_0_40px_var(--primary-glow)] transition-all duration-500">
              <HardDriveDownload className="w-10 h-10 text-[var(--primary)] group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-2xl font-black mb-3">통합 압축 해제</h3>
            <p className="text-zinc-500 text-sm text-center leading-relaxed font-medium">ZIP, 7Z, ISO, AppImage 등<br/>모든 포맷을 정복합니다</p>
            <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] text-[var(--primary)] font-bold tracking-widest uppercase">Select Archive</span>
            </div>
          </motion.div>

          {/* 압축 하기 섹션 */}
          <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCompress}
            className="group relative flex flex-col items-center justify-center p-12 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[40px] cursor-pointer hover:bg-[var(--glass-bg)]/20 hover:border-[var(--accent-indigo)]/40 transition-all duration-500 shadow-2xl"
          >
            <div className="w-20 h-20 bg-[var(--accent-indigo)]/10 rounded-3xl flex items-center justify-center mb-8 border border-[var(--accent-indigo)]/20 group-hover:bg-[var(--accent-indigo)] group-hover:shadow-[0_0_40px_var(--accent-indigo)]/40 transition-all duration-500">
              <Zap className="w-10 h-10 text-[var(--accent-indigo)] group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-2xl font-black mb-3">고발열 압축</h3>
            <p className="text-zinc-500 text-sm text-center leading-relaxed font-medium">데이터를 원자력급 성능으로<br/>안전하게 밀봉합니다</p>
            <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] text-[var(--accent-indigo)] font-bold tracking-widest uppercase">New Project</span>
            </div>
          </motion.div>

        </div>

        {/* 하단 상태바/정보 */}
        <div className="w-full max-w-2xl flex items-center justify-between px-6 text-[11px] text-zinc-600 font-bold tracking-tight">
          <div className="flex gap-6">
            <span className="flex items-center gap-2 group cursor-help"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]" /> <span className="group-hover:text-zinc-400 transition-colors">유니버설 익스트랙터 활성화</span></span>
            <span className="flex items-center gap-2 group cursor-help"><Box className="w-3.5 h-3.5" /> <span className="group-hover:text-zinc-400 transition-colors">ISO9660 & SquashFS 지원</span></span>
          </div>
          <div className="flex gap-6">
            <span className="hover:text-[var(--fg)] transition-colors cursor-pointer uppercase">History</span>
            <span className="hover:text-[var(--fg)] transition-colors cursor-pointer uppercase">Documentation</span>
          </div>
        </div>
      </main>

      {/* 진행 상황 및 파일 리스트 오버레이 */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--bg)]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12"
          >
            <div className="w-full max-w-xl space-y-10">
               <div className="space-y-4">
                 <div className="flex justify-between items-end">
                    <div className="space-y-1">
                       <h4 className="text-4xl font-black italic tracking-tighter text-[var(--fg)]">{statusMessage}</h4>
                       <p className="text-[var(--primary)] font-mono text-sm tracking-wider truncate max-w-sm">{currentFile || "대기 중..."}</p>
                    </div>
                    <span className="text-[var(--primary)] font-black text-5xl italic">{progress}%</span>
                 </div>
                 <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-blue)] shadow-[0_0_30px_var(--primary-glow)]"
                    />
                 </div>
               </div>
               
               <AnimatePresence>
                 {showFileList && archiveFiles.length > 0 && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-6 h-48 overflow-y-auto no-scrollbar"
                   >
                     <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">
                        <List className="w-3 h-3" /> Archive Contents
                     </div>
                     <div className="space-y-2">
                        {archiveFiles.slice(0, 10).map((file, idx) => (
                           <div key={idx} className="flex items-center gap-3 text-xs text-zinc-400 font-mono py-1 border-b border-white/[0.02] hover:text-[var(--fg)] transition-colors">
                              <FileCode className="w-3.5 h-3.5 text-[var(--primary)]/50" />
                              <span className="truncate">{file}</span>
                           </div>
                        ))}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="flex justify-center pt-4">
                  {progress === 100 ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <CheckCircle2 className="text-green-500 w-16 h-16 shadow-[0_0_40px_rgba(34,197,94,0.4)]" />
                      <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Operation Successful</span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin shadow-[0_0_30px_var(--primary-glow)]" />
                      <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                         <AlertCircle className="w-3 h-3" /> Analyzing Data Segments
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
