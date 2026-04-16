import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Hash, Video, MessageSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const { set18Plus, setUser, setStatus, setChatMode } = useStore();
  const [step, setStep] = useState(1);
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  const handleStart = (mode: 'text' | 'video') => {
    set18Plus(true);
    setChatMode(mode);
    setUser({ id: Math.random().toString(36).substring(7), interests });
    setStatus('searching');
  };

  const addInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (interestInput && !interests.includes(interestInput)) {
      setInterests([...interests, interestInput.toLowerCase()]);
      setInterestInput('');
    }
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter((i) => i !== tag));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-bg overflow-x-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-accent/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-xl w-full relative z-10"
      >
        <header className="mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-6 rounded-full border border-accent/20 bg-accent/5 backdrop-blur-sm"
          >
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-accent">Safe • Anonymous • AI-Moderated</span>
          </motion.div>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-2xl shadow-accent/40">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-text-primary">
              SafeConnect
            </h1>
          </div>
          <p className="text-text-secondary text-base leading-relaxed max-w-sm mx-auto">
            Spontaneous global connections without the toxicity. Redesigning anonymous chat with <strong>AI safety</strong> at the core.
          </p>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.98 }}
              className="bg-surface border border-border rounded-3xl p-10 space-y-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
            >
              <div className="space-y-6">
                <h3 className="text-2xl font-bold tracking-tight">Community Safety</h3>
                <div className="space-y-4">
                  <div className="flex gap-4 p-5 rounded-2xl bg-surface-bright/40 border border-border/50 hover:border-accent/30 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                      <Zap className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-bold mb-1">AI Content Moderation</p>
                      <p className="text-sm text-text-secondary leading-snug">Messages and video frames are scanned in real-time. Policy violations are blocked instantly.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-5 rounded-2xl bg-surface-bright/40 border border-border/50 hover:border-accent/30 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                      <Shield className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-bold mb-1">Total Anonymity</p>
                      <p className="text-sm text-text-secondary leading-snug">No accounts, no logs, no storage. You connect directly via secure P2P channels.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-danger/5 border border-danger/10 text-center">
                 <p className="text-sm font-medium text-text-secondary leading-relaxed">
                   By entering, you confirm you are <strong>18 years or older</strong> and agree to our behavioral safety guidelines.
                 </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-4.5 rounded-2xl bg-accent text-white font-bold text-lg hover:bg-accent-hover transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-[0.98]"
              >
                I am 18+ & Wish to Enter
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.98 }}
              className="bg-surface border border-border rounded-3xl p-10 space-y-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
            >
              <div className="space-y-6">
                <div className="text-center">
                   <h3 className="text-2xl font-bold tracking-tight mb-2">Refine Your Match</h3>
                   <p className="text-sm text-text-secondary uppercase tracking-[0.2em] font-bold">Interests Matching</p>
                </div>
                
                <form onSubmit={addInterest} className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Hash className="w-5 h-5 text-text-secondary group-focus-within:text-accent transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    placeholder="Enter interest (press add)..."
                    className="w-full bg-surface-bright border border-border rounded-2xl pl-12 pr-28 py-4 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all text-sm"
                  />
                  <div className="absolute right-2 top-2">
                    <button 
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-accent text-white text-[13px] font-bold hover:bg-accent-hover transition-all"
                    >
                      Add
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
                  <AnimatePresence>
                    {interests.map((tag) => (
                      <motion.span
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        key={tag}
                        className="px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold flex items-center gap-2 group cursor-default uppercase tracking-wider"
                      >
                        {tag}
                        <button 
                          onClick={() => removeInterest(tag)} 
                          className="w-4 h-4 rounded-full hover:bg-accent hover:text-white flex items-center justify-center transition-colors text-lg leading-none"
                        >
                          ×
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {interests.length === 0 && (
                    <p className="text-text-secondary text-[13px] font-medium opacity-60">Add tags like <span className="text-accent underline decoration-accent/30 cursor-pointer" onClick={() => setInterestInput('coding')}>coding</span> or <span className="text-accent underline decoration-accent/30 cursor-pointer" onClick={() => setInterestInput('gaming')}>gaming</span> for precision.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <button
                  onClick={() => handleStart('text')}
                  className="flex flex-col items-center justify-center p-8 rounded-3xl bg-surface-bright/50 border border-border hover:border-accent hover:bg-accent/5 transition-all group scale-100 hover:scale-[1.02] active:scale-98"
                >
                  <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                    <MessageSquare className="w-7 h-7 text-text-secondary group-hover:text-accent transition-colors" />
                  </div>
                  <span className="font-bold text-lg">Text Feed</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black text-text-secondary mt-1 opacity-60">High Performance</span>
                </button>
                <button
                  onClick={() => handleStart('video')}
                  className="flex flex-col items-center justify-center p-8 rounded-3xl bg-surface-bright/50 border border-border hover:border-accent hover:bg-accent/5 transition-all group scale-100 hover:scale-[1.02] active:scale-98"
                >
                   <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                    <Video className="w-7 h-7 text-text-secondary group-hover:text-accent transition-colors" />
                  </div>
                  <span className="font-bold text-lg">Video Stream</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black text-text-secondary mt-1 opacity-60">Peer-to-Peer</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-16 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] font-black text-text-secondary opacity-30">
            Secure • Anonymous • Open Platform
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
