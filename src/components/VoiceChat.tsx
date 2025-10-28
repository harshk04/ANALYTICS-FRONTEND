"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track, LocalAudioTrack, createLocalAudioTrack, createLocalVideoTrack, VideoPresets } from "livekit-client";
import { livekitCreateSession, livekitEndSession, livekitIssueToken, livekitQuery, livekitIngestTranscript, livekitMetadata } from "@/lib/queries";
import { useTheme } from "@/contexts/ThemeContext";

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  isEnabled: boolean;
  onToggle: () => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onInterimTranscript?: (text: string) => void;
}

export default function VoiceChat({ 
  onTranscript, 
  onError, 
  isEnabled, 
  onToggle, 
  onSpeakingChange,
  onInterimTranscript 
}: VoiceChatProps) {
  const { theme } = useTheme();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [livekitRoomToken, setLivekitRoomToken] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const isSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const voiceActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceProcessingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize browser speech recognition for voice input
  useEffect(() => {
    
    // Set up browser speech recognition as fallback
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (interimTranscript) {
          setInterimTranscript(interimTranscript);
          onInterimTranscript?.(interimTranscript);
        }
        
        if (finalTranscript) {
          setCurrentTranscript(finalTranscript);
          // Process the transcript - will be handled by the voice processing system
          onTranscript(finalTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [onInterimTranscript]);

  // LiveKit-based voice output with fallback to browser TTS
  const speakText = useCallback((text: string) => {
    
    // First try LiveKit TTS
    if (roomRef.current && sessionId) {
      try {
        const data = JSON.stringify({
          type: 'tts_request',
          text: text,
          timestamp: new Date().toISOString()
        });
        
        roomRef.current.localParticipant.publishData(
          new TextEncoder().encode(data),
          { reliable: true }
        );
        
        return;
      } catch (error) {
        console.error('Error sending TTS request to LiveKit:', error);
      }
    }
    
    // Fallback to browser TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        utterance.onerror = (error) => {
          console.error('❌ Browser TTS error:', error);
          setIsSpeaking(false);
        };
        
        speechSynthesis.speak(utterance);
        speechSynthesisRef.current = utterance;
      } catch (error) {
        console.error('❌ Browser TTS failed:', error);
      }
    }
  }, [sessionId]);

  // Process voice with fallback system
  const processVoiceWithLiveKit = useCallback(async (transcript: string) => {
    if (!sessionId) return;
    
    try {
      
      // Try LiveKit first, but fallback to regular chat API
      try {
        const axios = (await import('axios')).default;
        const sessionAPI = axios.create({
          baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Try LiveKit query first
        const queryResponse = await sessionAPI.post(`/livekit/session/${sessionId}/query`, {
          question: transcript,
          context: null
        });
        
        // Process LiveKit response
        if (queryResponse.data) {
          let responseText = '';
          if (typeof queryResponse.data === 'string') {
            responseText = queryResponse.data;
          } else if (typeof queryResponse.data === 'object') {
            responseText = queryResponse.data.text || queryResponse.data.message || queryResponse.data.response || JSON.stringify(queryResponse.data);
          }
          
          if (responseText && responseText.trim()) {
            
            // Trigger the transcript callback
            onTranscript(responseText);
            
            // Trigger TTS for the response
            speakText(responseText);
            return;
          }
        }
        
      } catch (livekitError: any) {
        
        // Fallback to regular chat API
        try {
          const axios = (await import('axios')).default;
          const sessionAPI = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          const chatResponse = await sessionAPI.post('/process_query', {
            natural_language_query: transcript,
            transcript_id: null,
            title: null,
            metadata: null,
            conversation_context: null
          });
          
          
          if (chatResponse.data) {
            let responseText = '';
            if (typeof chatResponse.data === 'string') {
              responseText = chatResponse.data;
            } else if (typeof chatResponse.data === 'object') {
              // Handle QueryProcessResponse format
              responseText = chatResponse.data.message || chatResponse.data.text || chatResponse.data.response || JSON.stringify(chatResponse.data);
            }
            
            if (responseText && responseText.trim()) {
              
              // Trigger the transcript callback
              onTranscript(responseText);
              
              // Trigger TTS for the response
              speakText(responseText);
            }
          }
        } catch (chatError) {
          console.error('❌ Chat API also failed:', chatError);
          onError('Failed to process voice query with both LiveKit and chat API');
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing voice:', error);
      onError(`Failed to process voice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [sessionId, onTranscript, onError, speakText]);

  // Start voice processing with fallback system
  const startVoiceProcessing = useCallback(() => {
    setIsVoiceActive(true);
    setIsListening(true);
    
    // Start browser speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('❌ Failed to start speech recognition:', error);
        onError('Failed to start voice recognition');
      }
    } else {
      onError('Speech recognition not available in this browser');
    }
  }, [onError]);

  // Stop voice processing
  const stopVoiceProcessing = useCallback(() => {
    setIsVoiceActive(false);
    setIsListening(false);
    
    // Stop browser speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Stop any ongoing speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
  }, []);

  useEffect(() => {
    if (isEnabled && !isConnected && !isConnecting) {
      startVoiceSession();
    } else if (!isEnabled && isConnected) {
      endVoiceSession();
    }
  }, [isEnabled]);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Send query to LiveKit agent for processing
  const sendQueryToLiveKit = useCallback(async (text: string) => {
    if (!sessionId) return;
    
    try {
      setIsProcessing(true);
      
      // Send query to LiveKit agent
      const response = await livekitQuery(sessionId, {
        question: text,
        context: null
      });
      
      
      // The response should contain the processed text
      if (response && typeof response === 'object') {
        const responseText = (response as any).text || (response as any).message || JSON.stringify(response);
        onTranscript(responseText);
        
        // LiveKit handles TTS on the server side
      }
      
    } catch (error) {
      console.error('Error sending query to LiveKit:', error);
      onError('Failed to process voice query with LiveKit agent');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, onTranscript, onError]);

  // Send transcript to LiveKit for processing
  const sendTranscriptToLiveKit = useCallback(async (text: string, role: 'user' | 'assistant' | 'system' = 'user') => {
    if (!sessionId) return;
    
    try {
      
      await livekitIngestTranscript(sessionId, {
        role,
        text,
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'voice_chat',
          processed: true
        }
      });
      
    } catch (error) {
      console.error('Error sending transcript to LiveKit:', error);
      onError('Failed to send transcript to LiveKit');
    }
  }, [sessionId, onError]);

  // Send voice query to LiveKit
  const sendVoiceQuery = useCallback(async (text: string) => {
    if (!sessionId) return;
    
    try {
      setIsProcessing(true);
      
      // Send query to LiveKit using your API
      const response = await livekitQuery(sessionId, {
        question: text,
        context: null
      });
      
      
      // Process the response
      if (response) {
        let responseText = '';
        if (typeof response === 'string') {
          responseText = response;
        } else if (typeof response === 'object') {
          responseText = (response as any).text || (response as any).message || (response as any).response || JSON.stringify(response);
        }
        
        if (responseText && responseText.trim()) {
          // Send the response as a transcript
          await livekitIngestTranscript(sessionId, {
            role: 'assistant',
            text: responseText,
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'voice_response',
              processed: true
            }
          });
          
          // Trigger the transcript callback
          onTranscript(responseText);
          
          // Trigger TTS for the response
          speakText(responseText);
        }
      }
      
    } catch (error) {
      console.error('Error sending voice query to LiveKit:', error);
      onError('Failed to process voice query with LiveKit');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, onTranscript, onError, speakText]);

  const startVoiceSession = async () => {
    try {
      setIsConnecting(true);
      onError("");


      // Create LiveKit session
      const sessionResponse = await livekitCreateSession({
        display_name: "User",
        transcript_id: null
      });


      // Store session ID
      setSessionId(sessionResponse.session_id);

      // Get room token
      const tokenResponse = await livekitIssueToken(sessionResponse.session_id);
      
      if (tokenResponse.token) {
        setLivekitRoomToken(tokenResponse.token);
      }

      // Start voice processing
      setIsConnected(true);
      setIsConnecting(false);
      startVoiceProcessing();
      

      if (!sessionResponse.session_id) {
        throw new Error("Failed to create LiveKit session");
      }

      setSessionId(sessionResponse.session_id);
      setLivekitRoomToken(sessionResponse.token);

      // Create room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setIsConnecting(false);
        // Start voice processing with LiveKit APIs
        startVoiceProcessing();
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setIsConnecting(false);
        stopVoiceProcessing();
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        setParticipants(prev => [...prev, participant]);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: Track, publication: any, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          
          // Create audio element if it doesn't exist
          if (!audioRef.current) {
            const audio = document.createElement('audio');
            audio.autoplay = true;
            audio.controls = false;
            audio.style.display = 'none';
            audio.preload = 'auto';
            audio.volume = 1.0;
            audio.muted = false;
            document.body.appendChild(audio);
            audioRef.current = audio;
          }
          
          // Attach the track to the audio element
          const audioElement = track.attach();
          
          // Set up audio element for playback
          if (audioRef.current) {
            // Set the audio source
            audioRef.current.srcObject = audioElement as any;
            audioRef.current.volume = 1.0;
            audioRef.current.muted = false;
            
            // Add event listeners before playing
            audioRef.current.onloadedmetadata = () => {
            };
            
            audioRef.current.oncanplay = () => {
              // Try to play when ready
              audioRef.current?.play().catch((error) => {
                console.error('❌ Auto-play failed:', error);
              });
            };
            
            audioRef.current.onplay = () => {
              setIsSpeaking(true);
            };
            
            audioRef.current.onended = () => {
              setIsSpeaking(false);
            };
            
            audioRef.current.onerror = (error) => {
              console.error('❌ Audio element error:', error);
              setIsSpeaking(false);
            };
            
            audioRef.current.onpause = () => {
              setIsSpeaking(false);
            };
            
            // Force play if autoplay doesn't work
            setTimeout(() => {
              if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play().then(() => {
                }).catch((error) => {
                  console.error('❌ Manual play failed:', error);
                });
              }
            }, 100);
          }
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        if (track.kind === Track.Kind.Audio) {
          setIsSpeaking(false);
        }
        track.detach();
      });

      newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          
          if (data.type === 'voice_transcript' && data.text) {
            // Handle voice transcript from LiveKit
            onTranscript(data.text);
            sendTranscriptToLiveKit(data.text, 'user');
          } else if (data.type === 'voice_response' && data.text) {
            // Handle voice response from LiveKit
            onTranscript(data.text);
            sendTranscriptToLiveKit(data.text, 'assistant');
            
            // Trigger TTS for the response
            speakText(data.text);
          } else if (data.type === 'voice_query' && data.text) {
            // Handle voice query
            sendVoiceQuery(data.text);
          } else if (data.type === 'interim_transcript' && data.text) {
            // Handle interim transcript
            setInterimTranscript(data.text);
            onInterimTranscript?.(data.text);
          } else if (data.type === 'agent_audio_ready') {
            // Agent is about to speak
            setIsSpeaking(true);
          } else if (data.type === 'agent_audio_end') {
            // Agent finished speaking
            setIsSpeaking(false);
          } else if (data.type === 'tts_response' && data.text) {
            // Handle TTS response from agent
            speakText(data.text);
          } else if (data.type === 'error') {
            // Handle errors from LiveKit
            console.error('❌ LiveKit error:', data.message);
            onError(data.message || 'LiveKit error occurred');
          }
        } catch (error) {
          console.error("❌ Error parsing LiveKit data:", error);
        }
      });

      // Connect to room
      
      // Use LiveKit Cloud WebSocket URL from environment
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://test-d2mkesrx.livekit.cloud';
      const roomName = `${process.env.NEXT_PUBLIC_LIVEKIT_ROOM_PREFIX || 'indus'}-${sessionResponse.session_id}`;
      
      
      // Validate token before connecting
      if (!sessionResponse.token) {
        throw new Error('No LiveKit token received from server');
      }
      
      if (sessionResponse.token.length < 10) {
        throw new Error('Invalid LiveKit token received from server');
      }
      
      // Connect to LiveKit room with error handling
      try {
        await newRoom.connect(livekitUrl, sessionResponse.token);
      } catch (connectError) {
        console.error('❌ Failed to connect to LiveKit room:', connectError);
        throw new Error(`Failed to connect to LiveKit: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
      }
      
      // Enable microphone with proper error handling
      try {
        // Request microphone permission first
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Create audio track from the stream
        const audioTrack = await createLocalAudioTrack({
          deviceId: stream.getAudioTracks()[0].getSettings().deviceId
        });
        
        // Stop the temporary stream
        stream.getTracks().forEach(track => track.stop());
        
        await newRoom.localParticipant.publishTrack(audioTrack);
        audioTrackRef.current = audioTrack;
        
        // Set up voice activity detection
        audioTrack.on('muted', () => {
          setIsMuted(true);
        });
        
        audioTrack.on('unmuted', () => {
          setIsMuted(false);
        });
        
        // Start voice processing
        startVoiceProcessing();
        
      } catch (micError) {
        console.error('❌ Microphone access denied:', micError);
        onError('Microphone access denied. Please allow microphone access and try again.');
        setIsConnecting(false);
        return;
      }

      setRoom(newRoom);
      roomRef.current = newRoom;
    } catch (error) {
      console.error("Error starting voice session:", error);
      onError("Failed to start voice chat. Please try again.");
      setIsConnecting(false);
    }
  };

  const endVoiceSession = async () => {
    try {
      // Stop voice processing
      stopVoiceProcessing();
      
      // Stop any ongoing speech
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      
      // Clean up audio track
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }
      
      // Clean up LiveKit room if it exists
      if (room) {
        await room.disconnect();
        setRoom(null);
        roomRef.current = null;
      }
      
      // Clean up LiveKit session if it exists
      if (sessionId) {
        try {
          await livekitEndSession(sessionId);
        } catch (error) {
        }
        setSessionId(null);
      }
      
      setIsConnected(false);
      setParticipants([]);
      setIsSpeaking(false);
      setIsListening(false);
      setIsProcessing(false);
      setIsVoiceActive(false);
      setInterimTranscript("");
      setCurrentTranscript("");
      
    } catch (error) {
      console.error("Error ending voice session:", error);
      onError("Error ending voice session");
    }
  };

  const toggleMute = async () => {
    if (!room || !audioTrackRef.current) return;

    try {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (publication && publication.track) {
        await (publication.track as any).setEnabled(isMuted);
        setIsMuted(!isMuted);
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      onError("Failed to toggle microphone");
    }
  };

  const sendMessage = async (message: string) => {
    if (!room || !sessionId) return;

    try {
      // Send message using LiveKit APIs
      await sendVoiceQuery(message);
      
      // Also send as data channel message for real-time communication
      const data = {
        type: 'voice_query',
        text: message,
        timestamp: new Date().toISOString()
      };
      
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      onError("Failed to send message");
    }
  };





  return (
    <div className="flex items-center justify-center gap-4">
      {/* Main Voice Controls */}
      <div className="flex items-center gap-3">
        {/* Voice Chat Toggle */}
        <button
          onClick={onToggle}
          disabled={isConnecting}
          className={`relative inline-flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 pressable group ${
            isEnabled
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
              : theme === "light"
              ? "bg-white/90 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-600 shadow-sm backdrop-blur-sm"
              : "bg-white/10 border border-white/20 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 backdrop-blur-sm"
          } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
          title={isEnabled ? "Disable voice chat" : "Enable voice chat"}
        >
          {/* Background glow effect */}
          {isEnabled && (
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
          )}
          
          {/* Icon container */}
          <div className="relative z-10">
            {isConnecting ? (
              <div className="w-6 h-6 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
            ) : isEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 group-hover:scale-110 transition-transform duration-200">
                <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5a.75.75 0 001.5 0v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 11-9 0v-.357z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 group-hover:scale-110 transition-transform duration-200">
                <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5a.75.75 0 001.5 0v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 11-9 0v-.357z" />
              </svg>
            )}
          </div>
          
          {/* Active indicator */}
          {isEnabled && (
            <div className="absolute -top-1 -right-1">
              <div className="w-4 h-4 bg-emerald-400 rounded-full animate-pulse shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping" />
            </div>
          )}
        </button>

        {/* Enhanced Status Indicator */}
        {isEnabled && (
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
            theme === "light"
              ? "bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200 shadow-sm backdrop-blur-sm"
              : "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 backdrop-blur-sm"
          }`}>
            {isListening && (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  </div>
                  <span className={`text-sm font-semibold ${
                    theme === "light" ? "text-emerald-700" : "text-emerald-400"
                  }`}>Listening</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-5 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </>
            )}
            {isSpeaking && !isListening && (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                  </div>
                  <span className={`text-sm font-semibold ${
                    theme === "light" ? "text-purple-700" : "text-purple-400"
                  }`}>Speaking</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </>
            )}
            {!isListening && !isSpeaking && (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-2 h-2 bg-teal-500 rounded-full animate-ping" />
                  </div>
                  <span className={`text-sm font-semibold ${
                    theme === "light" ? "text-teal-700" : "text-teal-400"
                  }`}>Ready</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-1 h-2 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-3 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-2 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden audio element for playback */}
      <audio 
        ref={audioRef} 
        autoPlay 
        controls={false}
        style={{ display: 'none' }}
        onEnded={() => {
          setIsSpeaking(false);
        }}
        onError={(e) => {
          console.error(' Audio element error:', e);
          setIsSpeaking(false);
        }}
        onPlay={() => {
          setIsSpeaking(true);
        }}
        onPause={() => {
          setIsSpeaking(false);
        }}
      />
    </div>
  );
}
