import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  RotateCcw, 
  ShieldAlert, 
  User as UserIcon, 
  ShieldCheck, 
  MoreVertical,
  Flag,
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  MessageSquare,
  Shield,
  ArrowRight,
  ChevronRight,
  Settings
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { moderateMessage } from '../lib/gemini';
import { cn } from '../lib/utils';

export default function ChatRoom() {
  const { 
    user, 
    setStatus, 
    status, 
    messages, 
    addMessage, 
    clearMessages, 
    chatMode,
    isBlurred,
    setIsBlurred
  } = useStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [inputText, setInputText] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Matchmaking Status Change
  useEffect(() => {
    if (status === 'searching' && socket) {
      socket.emit('join-queue', { interests: user?.interests || [] });
      clearMessages();
      addMessage({
        id: 'sys-searching',
        text: 'Searching for a stranger...',
        sender: 'System',
        timestamp: new Date().toISOString()
      });
    }
  }, [status, user, socket]);

  // Initial Socket Setup
  useEffect(() => {
    const s = io(window.location.origin);
    setSocket(s);

    s.on('matched', ({ roomId, initiator }) => {
      setRoomId(roomId);
      setStatus('connected');
      addMessage({
        id: 'sys-connected',
        text: 'Stranger connected. Say hello!',
        sender: 'System',
        timestamp: new Date().toISOString()
      });
      setIsBlurred(true); // Default blur for safety

      if (chatMode === 'video') {
         startWebRTC(roomId, initiator, s); // Pass socket to avoid closure issues
      }
    });

    s.on('signal', async ({ signal }) => {
      if (peerRef.current) {
        try {
          if (signal.type === 'offer') {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await peerRef.current.createAnswer();
            await peerRef.current.setLocalDescription(answer);
            s.emit('signal', { roomId, signal: answer });
          } else if (signal.type === 'answer') {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          } else if (signal.candidate) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(signal));
          }
        } catch (err) {
          console.error('Signaling error:', err);
        }
      }
    });

    s.on('receive-message', (msg) => {
      addMessage(msg);
    });

    s.on('peer-disconnected', () => {
      setStatus('disconnected');
      setRoomId(null);
      addMessage({
        id: 'sys-disconnected',
        text: 'Stranger has disconnected.',
        sender: 'System',
        timestamp: new Date().toISOString()
      });
      cleanupWebRTC();
    });

    return () => {
      s.disconnect();
      cleanupWebRTC();
    };
  }, []);

  // WebRTC Logic
  const startWebRTC = async (rId: string, initiator: boolean, s?: Socket | null) => {
    try {
      const activeSocket = s || socket;
      if (!activeSocket) return;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          activeSocket.emit('signal', { roomId: rId, signal: event.candidate });
        }
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        activeSocket.emit('signal', { roomId: rId, signal: offer });
      }
    } catch (err) {
      console.error('WebRTC Start Error:', err);
    }
  };

  const cleanupWebRTC = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setRemoteStream(null);
  };

  const handleNext = () => {
    cleanupWebRTC();
    setStatus('searching');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !roomId || isModerating) return;

    setIsModerating(true);
    const moderation = await moderateMessage(inputText);
    setIsModerating(false);

    if (!moderation.isSafe) {
      addMessage({
        id: `unsafe-${Date.now()}`,
        text: `Message blocked: ${moderation.reason}`,
        sender: 'System',
        timestamp: new Date().toISOString()
      });
      setInputText('');
      return;
    }

    if (socket) {
      socket.emit('send-message', { roomId, message: inputText });
    }
    
    addMessage({
      id: Math.random().toString(36).substring(7),
      text: inputText,
      sender: 'You',
      timestamp: new Date().toISOString()
    });
    setInputText('');
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-bg">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-surface z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-text-primary">SafeConnect</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-accent">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">AI Moderation Shield Active</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[12px] font-semibold text-success">
              {status === 'connected' ? 'Session Secure' : status === 'searching' ? '12,402 Users Online' : 'Standby'}
            </span>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-bright border border-border text-[12px] font-semibold hover:border-text-secondary transition-colors">
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </header>

      {/* Safety Banner */}
      <div className="bg-accent/10 text-accent/90 px-6 py-2 border-b border-accent/20 text-[13px] font-medium text-center shrink-0">
        ⚠️ Remember: Never share personal information, passwords, or social media handles with strangers.
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Video/Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-5 relative overflow-hidden bg-bg flex flex-col gap-4">
            <div className={cn(
               "flex-1 grid gap-4 overflow-hidden",
               chatMode === 'video' ? "grid-rows-2" : "grid-cols-1"
            )}>
              <AnimatePresence>
                {chatMode === 'video' ? (
                  <>
                    {/* Remote Video Container */}
                    <div className="relative rounded-xl overflow-hidden bg-black border border-border group">
                      <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        className={cn(
                          "w-full h-full object-cover transition-all duration-1000",
                          isBlurred && "blur-[60px] scale-110 opacity-60"
                        )}
                      />
                      <span className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/60 backdrop-blur-md rounded-md text-[12px] font-semibold border border-white/5">Stranger</span>
                      
                      {!remoteStream && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary gap-3 bg-surface/20">
                          <div className="w-16 h-16 rounded-full bg-surface-bright flex items-center justify-center animate-pulse">
                            <UserIcon className="w-8 h-8" />
                          </div>
                          <p className="font-semibold text-xs uppercase tracking-widest opacity-60">Connecting to stream...</p>
                        </div>
                      )}

                      {isBlurred && remoteStream && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-3xl">
                           <div className="max-w-xs w-full bg-surface p-8 rounded-2xl border border-border text-center transform scale-100 shadow-2xl">
                              <div className="w-14 h-14 bg-surface-bright rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-6 h-6 text-accent" />
                              </div>
                              <h3 className="text-xl font-bold mb-2">Privacy Shield</h3>
                              <p className="text-[13px] text-text-secondary mb-6 leading-relaxed">Video is blurred by default. Both users must consent to unblur for a safe experience.</p>
                              <button 
                                onClick={() => setIsBlurred(false)}
                                className="w-full py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-all active:scale-95 flex items-center justify-center gap-2"
                              >
                                Reveal Video
                                <ArrowRight className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                      )}
                    </div>

                    {/* Local Video Container */}
                    <div className="relative rounded-xl overflow-hidden bg-black border border-border group">
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover mirror opacity-90"
                      />
                      <span className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/60 backdrop-blur-md rounded-md text-[12px] font-semibold border border-white/5">You</span>
                      
                      {!localStream && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary bg-surface-bright">
                            <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center mb-3">
                              <VideoOff className="w-6 h-6" />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest opacity-40">Camera Inactive</span>
                         </div>
                      )}
                      
                      {/* Local Controls Overlay */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 duration-300">
                        <button 
                          onClick={toggleMic}
                          className={cn(
                            "p-3.5 rounded-xl transition-all shadow-xl",
                            isMicOn ? "bg-surface/80 backdrop-blur-md hover:bg-surface-bright" : "bg-danger text-white scale-110"
                          )}
                        >
                          {isMicOn ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
                        </button>
                        <button 
                          onClick={toggleVideo}
                          className={cn(
                            "p-3.5 rounded-xl transition-all shadow-xl",
                            isVideoOn ? "bg-surface/80 backdrop-blur-md hover:bg-surface-bright" : "bg-danger text-white scale-110"
                          )}
                        >
                          {isVideoOn ? <VideoIcon className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
                        </button>
                        <button 
                          onClick={() => setIsBlurred(!isBlurred)}
                          className="p-3.5 rounded-xl bg-surface/80 backdrop-blur-md hover:bg-surface-bright transition-all shadow-xl"
                        >
                          {isBlurred ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                       <div className="w-24 h-24 rounded-3xl bg-surface flex items-center justify-center border border-border shadow-2xl relative">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                            className="absolute -inset-1 rounded-3xl border-2 border-t-accent border-r-transparent border-b-transparent border-l-transparent opacity-40" 
                          />
                          <MessageSquare className="w-10 h-10 text-accent" />
                       </div>
                       <div className="text-center space-y-1">
                         <h2 className="text-xl font-bold tracking-tight">Focus Only Messaging</h2>
                         <p className="text-text-secondary text-xs uppercase tracking-widest">Minimal latency active</p>
                       </div>
                    </div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Main Action Controls */}
            <div className="flex items-center gap-3 shrink-0 py-2">
              <button 
                onClick={() => setStatus('idle')}
                className="px-6 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger font-bold text-sm hover:bg-danger/20 transition-all active:scale-95"
              >
                Stop
              </button>
              <button 
                onClick={handleNext}
                disabled={status === 'searching'}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-all active:scale-[0.98] shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                {status === 'searching' ? 'Finding someone...' : 'Next Stranger'}
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
              <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-bright border border-border font-bold text-sm hover:border-text-secondary transition-colors group">
                 <Flag className="w-4 h-4 text-text-secondary group-hover:text-danger transition-colors" />
                 Report Abuse
              </button>
            </div>
          </div>
        </main>

        {/* Chat Sidebar */}
        <aside className="w-[380px] flex flex-col bg-surface border-l border-border shrink-0">
          <div className="p-4 h-16 flex items-center justify-between border-b border-border">
            <div>
              <p className="font-bold text-sm">Chat Session</p>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary">ID: #{roomId?.slice(-6) || '---'}</p>
            </div>
            <button className="px-3 py-1.5 rounded bg-surface-bright border border-border text-[10px] font-bold uppercase tracking-wider hover:bg-border transition-colors">
              Export Log
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 pb-8 space-y-4 scroll-smooth">
            {messages.map((msg) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[90%]",
                  msg.sender === 'You' ? "ml-auto items-end" : msg.sender === 'System' ? "mx-auto items-center" : "items-start"
                )}
              >
                {msg.sender === 'System' ? (
                  <div className="w-full text-center py-2 px-4 rounded-xl text-[11px] font-medium text-text-secondary leading-relaxed bg-bg/20 border border-border/10">
                    {msg.text.includes('Coding') ? (
                      <>
                        Connected with a stranger who shares your interest in <span className="text-accent font-bold">Coding</span>.
                      </>
                    ) : msg.text}
                  </div>
                ) : (
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-[14px] leading-snug break-words shadow-sm",
                    msg.sender === 'You' 
                      ? "bg-accent text-white rounded-br-sm glow-accent/20" 
                      : "bg-surface-bright border border-border/50 text-text-primary rounded-bl-sm"
                  )}>
                    {msg.text}
                  </div>
                )}
              </motion.div>
            ))}
            
            {/* AI Safety Status */}
            <AnimatePresence>
               {messages.length > 5 && (
                 <motion.div 
                   initial={{ opacity: 0 }} 
                   animate={{ opacity: 1 }}
                   className="text-center pt-4"
                 >
                   <span className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-[0.2em] bg-bg/30 px-3 py-1 rounded-full border border-border/5">
                     [ AI Shield Active: No Violations ]
                   </span>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>

          {/* Input Area */}
          <div className="p-5 border-t border-border bg-surface shrink-0">
             {/* Dynamic Interests Toolbar */}
             <div className="flex items-center gap-2 mb-4 bg-surface-bright border border-border rounded-lg p-2.5 overflow-hidden">
                <span className="text-[11px] font-bold text-text-secondary whitespace-nowrap">INTERESTS:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                   {(user?.interests || ['Chatting']).map(tag => (
                     <span key={tag} className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded uppercase tracking-wider">{tag}</span>
                   ))}
                   <button className="text-[10px] font-bold text-accent/60 whitespace-nowrap px-1 hover:text-accent">+ ADD MORE</button>
                </div>
             </div>

            <form onSubmit={handleSendMessage} className="relative flex p-1.5 bg-surface-bright border border-border rounded-xl">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={status !== 'connected' || isModerating}
                placeholder={status === 'connected' ? "Type a safe message..." : "Waiting..."}
                className="flex-1 bg-transparent border-none px-3 py-2.5 focus:outline-none text-[14px] placeholder:text-text-secondary/50"
              />
              <button
                type="submit"
                disabled={status !== 'connected' || !inputText.trim() || isModerating}
                className="px-5 py-2.5 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-all disabled:opacity-30 flex items-center gap-2"
              >
                {isModerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send'}
              </button>
            </form>
            
            <div className="mt-3 flex items-center justify-center gap-4">
               <div className="flex items-center gap-1.5 text-accent text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Secured
               </div>
               <div className="w-1 h-1 rounded-full bg-border" />
               <div className="text-[11px] text-text-secondary/60">
                  Press <kbd className="font-sans px-1.5 py-0.5 bg-bg rounded border border-border">ENTER</kbd>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
