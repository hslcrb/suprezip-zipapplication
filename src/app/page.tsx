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
  XCircle
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
        filters: [{ name: 'Archive', extensions: ['zip'] }]
      });

      if (selected && typeof selected === 'string') {
        setIsProcessing(true);
        setStatusMessage("Extracting archive...");
        setProgress(30);

        // In a real app, we'd pick a target dir. For now, let's just use the parent dir.
        const zipPath = selected;
        const targetDir = zipPath.substring(0, zipPath.lastIndexOf('\\')) || zipPath.substring(0, zipPath.lastIndexOf('/'));

        await invoke("extract_files", { zipPath, targetDir });
        
        setProgress(100);
        setStatusMessage("Extraction complete!");
        await message("Successfully extracted archive.", { title: "Success", kind: "info" });
      }
    } catch (error) {
      console.error(error);
      await message(`Error: ${error}`, { title: "Error", kind: "error" });
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
        setStatusMessage("Compressing folder...");
        setProgress(45);

        const srcDir = selected;
        const zipPath = `${srcDir}.zip`;

        await invoke("compress_files", { srcDir, zipPath });

        setProgress(100);
        setStatusMessage("Compression complete!");
        await message(`Archive created at ${zipPath}`, { title: "Success", kind: "info" });
      }
    } catch (error) {
      console.error(error);
      await message(`Error: ${error}`, { title: "Error", kind: "error" });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 2000);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#030303] overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-10 left-10 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <FileArchive className="text-white w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tighter text-white">
          SUPREZIP
        </h1>
      </motion.header>

      {/* Main Container */}
      <main className="w-full max-w-4xl relative z-10 flex flex-col gap-8">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 mb-4">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500"
          >
            The Ultimate Compression.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 text-lg max-w-xl mx-auto"
          >
            Built with Rust for unprecedented speed. Supports Zip64 and legacy encodings with zero artifacts.
          </motion.p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Extract Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExtract}
            className="glass glass-hover p-8 rounded-3xl cursor-pointer group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                <Box className="w-24 h-24 text-primary" />
             </div>
             
             <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Extract</h3>
                  <p className="text-zinc-500 text-sm">Select an archive to unzip with blazing speed.</p>
                </div>
                <div className="flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-4 transition-all">
                  Open File <ChevronRight className="w-4 h-4" />
                </div>
             </div>
          </motion.div>

          {/* Compress Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCompress}
            className="glass glass-hover p-8 rounded-3xl cursor-pointer group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                <Zap className="w-24 h-24 text-indigo-500" />
             </div>

             <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Compress</h3>
                  <p className="text-zinc-500 text-sm">Select a folder to create a high-performance archive.</p>
                </div>
                <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold group-hover:gap-4 transition-all">
                  Select Folder <ChevronRight className="w-4 h-4" />
                </div>
             </div>
          </motion.div>

        </div>

        {/* Footer Info */}
        <footer className="flex justify-between items-center px-4 text-zinc-600 text-xs">
          <div className="flex gap-6">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Rust Core v0.1.0</span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors"><Settings className="w-3 h-3" /> Settings</span>
          </div>
          <div className="flex gap-4">
            <span className="cursor-pointer hover:text-white">Documentation</span>
            <span className="cursor-pointer hover:text-white">Support</span>
          </div>
        </footer>

      </main>

      {/* Progress Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-6">
               <div className="flex justify-between items-end">
                  <h4 className="text-2xl font-bold text-white">{statusMessage}</h4>
                  <span className="text-primary font-mono">{progress}%</span>
               </div>
               <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  />
               </div>
               <div className="flex justify-center">
                  {progress === 100 ? (
                    <CheckCircle2 className="text-green-500 w-8 h-8 animate-bounce" />
                  ) : (
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
