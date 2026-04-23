
import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Phone, Sparkles, Image as ImageIcon, Mic, X, Send } from 'lucide-react';

// --- Audio Helper Functions ---

const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

const base64Encode = (arrayBuffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64Decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// --- Component ---

const ChatInterface: React.FC = () => {
  // Text Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'model',
      text: "Bonjour ! Je suis votre Coach Love personnel. Une dispute à régler ? Besoin d'une idée romantique ? Écrivez-moi ou appelez-moi ! 💖",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<any>(null); // Type 'Chat' from SDK
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Mode State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0); // For visualization (0-100)
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const outputAudioContextRef = useRef<AudioContext | null>(null);

  // Transcription Refs (to accumulate text stream)
  const inputTranscriptRef = useRef<string>('');
  const outputTranscriptRef = useRef<string>('');

  useEffect(() => {
    // Initialize text chat session
    chatSessionRef.current = geminiService.createCoachChat();
    return () => {
      // Cleanup on unmount
      stopVoiceSession();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isVoiceMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- Text Chat Logic ---

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const responseText = result.text || "Désolé, je me suis perdu dans mes pensées...";

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Oups, j'ai eu un petit souci de connexion. Réessayez ?",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Voice Mode Logic ---

  const startVoiceSession = async () => {
    setIsVoiceMode(true);
    setIsVoiceConnected(false); // connecting...
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
      
      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, // Enable user speech transcription
          outputAudioTranscription: {}, // Enable model speech transcription
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: {
             parts: [{ text: `Tu es le "Coach Love" d'Andrea et Maurice. Tu es un médiateur bienveillant, sage et drôle. 
             Tes réponses doivent être concises, chaleureuses et naturelles à l'oral. 
             N'hésite pas à faire de l'humour. Si tu entends un silence, propose un sujet.` }]
          }
        },
        callbacks: {
            onopen: () => {
              console.log("Voice session connected");
              setIsVoiceConnected(true);
              
              // Setup Input Stream Processing
              if (!audioContextRef.current || !mediaStreamRef.current) return;
              
              sourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              
              processorRef.current.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Simple volume meter logic
                let sum = 0;
                for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setVoiceVolume(Math.min(100, rms * 400)); // Amplify for visual

                // Convert and Send
                const pcm16 = floatTo16BitPCM(inputData);
                const base64Data = base64Encode(pcm16);
                
                sessionPromise.then(session => {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Data
                        }
                    });
                });
              };

              sourceRef.current.connect(processorRef.current);
              processorRef.current.connect(audioContextRef.current.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
                const serverContent = msg.serverContent;
                
                // 1. Handle Transcription Accumulation
                if (serverContent?.inputTranscription?.text) {
                  inputTranscriptRef.current += serverContent.inputTranscription.text;
                }
                if (serverContent?.outputTranscription?.text) {
                  outputTranscriptRef.current += serverContent.outputTranscription.text;
                }

                // 2. Handle Turn Completion (Push to Chat History)
                if (serverContent?.turnComplete) {
                   // Add User Message if exists
                   if (inputTranscriptRef.current.trim()) {
                     const userText = inputTranscriptRef.current.trim();
                     setMessages(prev => [...prev, {
                        id: Date.now().toString() + '_user',
                        role: 'user',
                        text: userText,
                        timestamp: Date.now()
                     }]);
                     inputTranscriptRef.current = '';
                   }

                   // Add Model Message if exists
                   if (outputTranscriptRef.current.trim()) {
                     const modelText = outputTranscriptRef.current.trim();
                     setMessages(prev => [...prev, {
                        id: Date.now().toString() + '_model',
                        role: 'model',
                        text: modelText,
                        timestamp: Date.now()
                     }]);
                     outputTranscriptRef.current = '';
                     
                     // Reset visual volume when turn is done
                     setVoiceVolume(0);
                   }
                }

                // 3. Handle Audio Output
                if (serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
                    const base64Audio = serverContent.modelTurn.parts[0].inlineData.data;
                    const audioData = base64Decode(base64Audio);
                    
                    if (outputAudioContextRef.current) {
                        const audioBuffer = outputAudioContextRef.current.createBuffer(1, audioData.length / 2, 24000);
                        const channelData = audioBuffer.getChannelData(0);
                        const view = new DataView(audioData.buffer);
                        
                        for (let i = 0; i < channelData.length; i++) {
                            channelData[i] = view.getInt16(i * 2, true) / 32768.0;
                        }

                        // Simulate volume for AI speech visualization
                        setVoiceVolume(Math.random() * 50 + 30);

                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        
                        // Schedule playback
                        const currentTime = outputAudioContextRef.current.currentTime;
                        if (nextStartTimeRef.current < currentTime) {
                            nextStartTimeRef.current = currentTime;
                        }
                        
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                    }
                }
            },
            onclose: () => {
                console.log("Voice session closed");
                setIsVoiceConnected(false);
                setIsVoiceMode(false);
            },
            onerror: (err) => {
                console.error("Voice session error", err);
                setIsVoiceConnected(false);
                alert("Erreur de connexion audio. Veuillez vérifier votre micro.");
                stopVoiceSession();
            }
        }
      });
      
      liveSessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start voice session", error);
      alert("Impossible de démarrer le mode vocal. Vérifiez que vous avez autorisé le micro et que la clé API est valide.");
      setIsVoiceMode(false);
    }
  };

  const stopVoiceSession = () => {
    // Stop tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Disconnect nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close Audio Contexts
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    // Close Gemini Session
    if (liveSessionRef.current) {
        liveSessionRef.current.then((session: any) => session.close());
        liveSessionRef.current = null;
    }

    // Flush any remaining transcripts
    if (inputTranscriptRef.current.trim()) {
        setMessages(prev => [...prev, {
            id: Date.now().toString() + '_user_final',
            role: 'user',
            text: inputTranscriptRef.current.trim(),
            timestamp: Date.now()
        }]);
    }
    if (outputTranscriptRef.current.trim()) {
        setMessages(prev => [...prev, {
            id: Date.now().toString() + '_model_final',
            role: 'model',
            text: outputTranscriptRef.current.trim(),
            timestamp: Date.now()
        }]);
    }

    setIsVoiceMode(false);
    setIsVoiceConnected(false);
    setVoiceVolume(0);
  };


  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-[80dvh] md:h-[600px] glass rounded-[2.5rem] border-white/5 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* --- HEADER --- */}
      <div className="absolute top-0 left-0 right-0 p-6 z-30 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-1 transition-all duration-500 ${isVoiceMode ? 'bg-rose-500 ring-rose-400/50' : 'bg-white/10 backdrop-blur-md ring-white/20'}`}>
              <span className="text-xl">{isVoiceMode ? '🎙️' : '🤖'}</span>
            </div>
            {/* Status dot */}
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#1a0b4d] rounded-full transition-colors ${isVoiceConnected ? 'bg-emerald-500' : 'bg-emerald-500'}`}></div>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm drop-shadow-md">{isVoiceMode ? 'Appel en cours' : 'Coach Love'}</h3>
            <p className="text-[10px] text-white/70 uppercase tracking-wider flex items-center gap-1 drop-shadow-sm">
              <span className={`w-1 h-1 rounded-full ${isVoiceConnected ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`}></span>
              {isVoiceMode ? (isVoiceConnected ? 'Connecté' : 'Connexion...') : 'En ligne'}
            </p>
          </div>
        </div>

        <button 
            onClick={() => {
                if (isVoiceMode) {
                    stopVoiceSession();
                } else {
                    setMessages([{
                        id: Date.now().toString(),
                        role: 'model',
                        text: "De quoi voulez-vous parler maintenant ?",
                        timestamp: Date.now()
                    }]);
                    chatSessionRef.current = geminiService.createCoachChat();
                }
            }}
            className="pointer-events-auto p-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white/60 hover:text-white transition-all"
            title="Nouvelle conversation"
        >
            <X className="w-5 h-5" />
        </button>
      </div>

      {/* --- VOICE MODE UI --- */}
      {isVoiceMode ? (
          <div className="absolute inset-0 z-20 flex flex-col bg-[#050505]">
             {/* Background Effects */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
                 <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-rose-500/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
             </div>

             {/* Main Visualizer Area - Takes up available space */}
             <div className="flex-1 flex flex-col items-center justify-end relative w-full pb-4">
                
                {/* The Orb/Visualizer */}
                <div className="relative flex items-center justify-center">
                    {/* Rings - Clamped size */}
                    <div 
                        className="absolute rounded-full border border-rose-500/20 transition-all duration-100 ease-out"
                        style={{ 
                            width: `${Math.min(300, 140 + voiceVolume * 2)}px`, 
                            height: `${Math.min(300, 140 + voiceVolume * 2)}px`,
                            opacity: Math.max(0.1, voiceVolume / 100)
                        }}
                    ></div>
                     <div 
                        className="absolute rounded-full border border-indigo-500/20 transition-all duration-200 ease-out delay-75"
                        style={{ 
                            width: `${Math.min(260, 110 + voiceVolume * 1.5)}px`, 
                            height: `${Math.min(260, 110 + voiceVolume * 1.5)}px`,
                            opacity: Math.max(0.2, voiceVolume / 80)
                        }}
                    ></div>

                    {/* Core Orb */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 shadow-[0_0_60px_rgba(225,29,72,0.5)] flex items-center justify-center relative z-10 animate-float">
                        <span className="text-4xl text-white drop-shadow-md">🎙️</span>
                    </div>
                </div>
             </div>

             {/* Bottom Sheet Controls - Fixed at bottom */}
             <div className="w-full bg-gradient-to-t from-black via-[#02010a]/90 to-transparent pb-10 pt-16 px-6 flex flex-col items-center justify-end gap-8 z-30">
                 
                 <div className="text-center space-y-3">
                     <h2 className="text-3xl font-serif text-white drop-shadow-xl tracking-wide">
                        {isVoiceConnected ? "Je vous écoute..." : "Connexion..."}
                     </h2>
                     <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">
                        Parlez naturellement
                     </p>
                 </div>

                 {/* Modern Call Action Button */}
                 <button 
                    onClick={stopVoiceSession}
                    className="group relative flex items-center gap-3 px-8 py-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-100 hover:bg-red-600 hover:border-red-500 hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] active:scale-95"
                 >
                     <div className="p-1 bg-red-500 rounded-full text-white">
                         <Phone className="w-5 h-5 fill-current" />
                     </div>
                     <span className="font-bold text-sm tracking-widest uppercase pr-1">Raccrocher</span>
                 </button>
             </div>
          </div>
      ) : (
          /* --- TEXT CHAT UI --- */
          <>
            <div className="flex-1 overflow-y-auto p-4 pt-20 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex w-full flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                    <div 
                    className={`max-w-[85%] px-5 py-4 text-sm leading-relaxed backdrop-blur-xl transition-all duration-300 ${
                        msg.role === 'user' 
                        ? 'bg-white/10 text-white rounded-[1.5rem] rounded-tr-sm border border-white/10 shadow-lg' 
                        : 'bg-black/40 text-white rounded-[1.5rem] rounded-tl-sm border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                    }`}
                    >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    
                    <div className={`flex items-center gap-1.5 mt-2 text-[10px] ${msg.role === 'user' ? 'justify-end text-white/50' : 'justify-start text-orange-200/50'}`}>
                        <span>{formatTime(msg.timestamp)}</span>
                    </div>
                    </div>
                </div>
                ))}
                
                {isTyping && (
                <div className="flex justify-start w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-black/40 backdrop-blur-xl px-5 py-4 rounded-[1.5rem] rounded-tl-sm border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)] flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Area */}
            <div className="p-4 pb-6 bg-[#0a0a0a] border-t border-white/5 z-20">
                <div className="flex items-center gap-2 p-1.5 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl ring-1 ring-white/5">
                    
                    {/* Call Button (Left) */}
                    <button 
                        onClick={startVoiceSession}
                        className="flex-shrink-0 w-12 h-12 rounded-full bg-[#D0FD3E] hover:bg-[#bce635] text-black flex items-center justify-center transition-transform active:scale-95 shadow-[0_0_15px_rgba(208,253,62,0.3)]"
                        title="Appeler le Coach"
                    >
                        <Phone className="w-6 h-6 fill-current" />
                    </button>

                    {/* Input Field */}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Aa"
                        className="flex-1 bg-transparent border-none px-2 text-white placeholder-white/40 focus:outline-none focus:ring-0 text-base"
                        disabled={isTyping}
                    />

                    {/* Right Actions */}
                    <div className="flex items-center gap-1 pr-1">
                        {input.trim() && (
                             <button 
                                onClick={handleSend}
                                disabled={isTyping}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                             >
                                <Send className="w-5 h-5" />
                             </button>
                        )}
                    </div>
                </div>
            </div>
          </>
      )}
    </div>
  );
};

export default ChatInterface;
