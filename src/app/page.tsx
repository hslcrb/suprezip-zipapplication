"use client";

import { useState } from "react";
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
  FolderOpen,
  LayoutGrid,
  Info
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open, message } from "@tauri-apps/plugin-dialog";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const handleExtract = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: '압축 파일', extensions: ['zip'] }]
      });

      if (selected && typeof selected === 'string') {
        setIsProcessing(true);
        setStatusMessage("압축을 푸는 중입니다...");
        setProgress(30);

        const zipPath = selected;
        const targetDir = zipPath.substring(0, zipPath.lastIndexOf('\\')) || zipPath.substring(0, zipPath.lastIndexOf('/'));

        await invoke("extract_files", { zipPath, targetDir });
        
        setProgress(100);
        setStatusMessage("압축 해제 완료!");
        await message("성공적으로 압축을 해제했습니다.", { title: "성공", kind: "info" });
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

  const handleCompress = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });

      if (selected && typeof selected === 'string') {
        setIsProcessing(true);
        setStatusMessage("압축 파일을 만드는 중입니다...");
        setProgress(45);

        const srcDir = selected;
        const zipPath = `${srcDir}.zip`;

        await invoke("compress_files", { srcDir, zipPath });

        setProgress(100);
        setStatusMessage("압축 완료!");
        await message(`압축 파일이 생성되었습니다: ${zipPath}`, { title: "성공", kind: "info" });
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
    <div className="relative min-h-screen w-full flex flex-col bg-[#050505] text-zinc-100 font-sans select-none overflow-hidden">
      
      {/* 콤팩트 툴바 헤더 */}
      <header className="h-14 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <FileArchive className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tighter text-lg uppercase">Suprezip</span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-500 font-mono">v0.1.0-RUST</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Settings className="w-4 h-4 text-zinc-400" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Info className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </header>

      {/* 메인 작업 영역 */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-10 relative">
        {/* 은은한 배경 효과 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full" />
        
        <div className="w-full max-w-2xl grid grid-cols-2 gap-6 relative z-10">
          
          {/* 압축 해제 섹션 */}
          <motion.div 
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExtract}
            className="group relative flex flex-col items-center justify-center p-10 bg-white/[0.02] border border-white/5 rounded-[32px] cursor-pointer hover:bg-white/[0.04] hover:border-blue-500/30 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:bg-blue-600 group-hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all">
              <UploadCloud className="w-8 h-8 text-blue-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold mb-2">압축 풀기</h3>
            <p className="text-zinc-500 text-sm text-center">압축된 파일을 선택하여<br/>빠르게 해제합니다</p>
          </motion.div>

          {/* 압축 하기 섹션 */}
          <motion.div 
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCompress}
            className="group relative flex flex-col items-center justify-center p-10 bg-white/[0.02] border border-white/5 rounded-[32px] cursor-pointer hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all">
              <HardDrive className="w-8 h-8 text-indigo-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold mb-2">새 압축 파일</h3>
            <p className="text-zinc-500 text-sm text-center">폴더를 선택하여<br/>새 압축 파일을 만듭니다</p>
          </motion.div>

        </div>

        {/* 하단 상태바/정보 */}
        <div className="w-full max-w-2xl flex items-center justify-between px-4 text-[11px] text-zinc-600 font-medium">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-blue-500" /> Rust 엔진 최적화 완료</span>
            <span className="flex items-center gap-1.5"><Box className="w-3 h-3" /> Zip64 대용량 지원</span>
          </div>
          <div className="flex gap-4 cursor-pointer">
            <span className="hover:text-zinc-400 transition-colors">최근 작업 기록</span>
            <span className="hover:text-zinc-400 transition-colors">사용 방법</span>
          </div>
        </div>
      </main>

      {/* 진행 상황 오버레이 */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-10"
          >
            <div className="w-full max-w-md space-y-8">
               <div className="space-y-2">
                 <div className="flex justify-between items-end">
                    <h4 className="text-3xl font-black tracking-tight text-white">{statusMessage}</h4>
                    <span className="text-blue-500 font-mono text-xl font-bold">{progress}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]"
                    />
                 </div>
               </div>
               
               <div className="flex justify-center flex-col items-center gap-4">
                  {progress === 100 ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <CheckCircle2 className="text-green-500 w-12 h-12" />
                      <span className="text-zinc-400 text-sm">잠시 후 창이 닫힙니다...</span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-zinc-500 text-xs animate-pulse">본질적인 성능으로 작업 중...</span>
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
