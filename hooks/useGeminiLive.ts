'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RestorationJob, LossPerilType, MoldConditionLevel, StandardizedAction, ThermalReading } from '@/lib/types';

export interface GeminiLiveToolCall {
  id?: string;
  name: string;
  args: Record<string, any>;
}

interface UseGeminiLiveOptions {
  job: RestorationJob;
  onUpdateJob: (updatedJob: RestorationJob) => void;
  noiseGateLoudSite?: boolean;
}

export function useGeminiLive({ job, onUpdateJob, noiseGateLoudSite = false }: UseGeminiLiveOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string>('Main Affected Area');
  const [frequencies, setFrequencies] = useState<number[]>(new Array(16).fill(0));
  const [lastUserTranscript, setLastUserTranscript] = useState<string>('');
  const [lastModelTranscript, setLastModelTranscript] = useState<string>('');
  const [recentToolActivity, setRecentToolActivity] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [voiceHistory, setVoiceHistory] = useState<Array<{ timestamp: string; action: string; details: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isModelSpeakingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const isSpeakerMutedRef = useRef<boolean>(false);
  const noiseGateLoudSiteRef = useRef<boolean>(noiseGateLoudSite);
  const jobRef = useRef<RestorationJob>(job);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
  }, [isSpeakerMuted]);

  useEffect(() => {
    noiseGateLoudSiteRef.current = noiseGateLoudSite;
  }, [noiseGateLoudSite]);

  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  // Convert Float32Array to 16-bit PCM little-endian Base64
  const pcmFloat32ToBase64 = (float32Array: Float32Array): string => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Convert Base64 16-bit PCM to Float32Array AudioBuffer for 24kHz playback
  const playPcmAudioChunk = (base64Audio: string) => {
    if (isSpeakerMutedRef.current) return;

    try {
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
      }

      const ctx = outputAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.push(source);
      isModelSpeakingRef.current = true;

      source.onended = () => {
        const idx = activeSourcesRef.current.indexOf(source);
        if (idx > -1) activeSourcesRef.current.splice(idx, 1);
        if (activeSourcesRef.current.length === 0) {
          isModelSpeakingRef.current = false;
        }
      };
    } catch (e) {
      console.error('[GeminiLive] Error playing audio chunk:', e);
    }
  };

  // Stop all active model audio on interruption
  const stopPlayback = () => {
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    isModelSpeakingRef.current = false;
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  // Tool Call Execution Handler
  const handleToolCalls = useCallback((functionCalls: GeminiLiveToolCall[]) => {
    const currentJob = jobRef.current;
    let updatedJob = { ...currentJob };
    const functionResponses: any[] = [];

    for (const call of functionCalls) {
      const { name, args, id } = call;
      console.log(`[GeminiLive] Executing tool: ${name}`, args);

      let responseContent: Record<string, any> = { status: 'success' };

      if (name === 'classify_loss_type') {
        const { lossType, waterCategory, moldCondition, containmentRequired, reasoning } = args;
        updatedJob = {
          ...updatedJob,
          lossType: lossType || 'water',
          category: waterCategory || updatedJob.category,
          moldCondition: moldCondition || updatedJob.moldCondition,
          containmentRequired: Boolean(containmentRequired),
          technicianNotes: `${updatedJob.technicianNotes}\n[Loss Peril Classified]: ${lossType.toUpperCase()} - ${reasoning || ''}`.trim()
        };
        setRecentToolActivity(`✓ Classified as ${lossType.toUpperCase()}`);
        setVoiceHistory(prev => [
          { timestamp: new Date().toLocaleTimeString(), action: 'Classify Peril', details: `${lossType} (${reasoning || ''})` },
          ...prev
        ]);
        responseContent = { status: 'success', classifiedAs: lossType };

      } else if (name === 'set_active_room') {
        const room = args.roomName || 'Loss Area';
        setActiveRoom(room);
        setRecentToolActivity(`📍 Active Room: ${room}`);
        responseContent = { status: 'success', activeRoom: room };

      } else if (name === 'record_room_dimensions') {
        const { roomName, lengthFt, widthFt, heightFt, floodCutHeightInches, linearFtBaseboard } = args;
        const targetRoom = roomName || activeRoom || 'Loss Area';
        const existingIdx = updatedJob.dimensions.findIndex(d => d.roomName.toLowerCase() === targetRoom.toLowerCase());

        const newDim = {
          roomName: targetRoom,
          lengthFt: Number(lengthFt) || 12,
          widthFt: Number(widthFt) || 12,
          heightFt: Number(heightFt) || 8,
          affectedFloorSqFt: (Number(lengthFt) || 12) * (Number(widthFt) || 12),
          floodCutHeightInches: floodCutHeightInches ? Number(floodCutHeightInches) : undefined,
          linearFtBaseboard: linearFtBaseboard ? Number(linearFtBaseboard) : undefined
        };

        if (existingIdx >= 0) {
          const dims = [...updatedJob.dimensions];
          dims[existingIdx] = newDim;
          updatedJob = { ...updatedJob, dimensions: dims };
        } else {
          updatedJob = { ...updatedJob, dimensions: [...updatedJob.dimensions, newDim] };
        }

        setActiveRoom(targetRoom);
        setRecentToolActivity(`✓ Logged ${targetRoom}: ${newDim.lengthFt}×${newDim.widthFt}ft`);
        setVoiceHistory(prev => [
          { timestamp: new Date().toLocaleTimeString(), action: 'Room Dimensions', details: `${targetRoom} (${newDim.lengthFt}x${newDim.widthFt}x${newDim.heightFt})` },
          ...prev
        ]);
        responseContent = { status: 'success', room: newDim };

      } else if (name === 'record_moisture_reading') {
        const { roomName, substrate, readingValue, unit, dryStandard } = args;
        const targetRoom = roomName || activeRoom || 'Loss Area';
        const newReading = {
          id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          roomName: targetRoom,
          substrate: substrate || 'Drywall',
          readingValue: Number(readingValue) || 25,
          unit: unit || '% WME',
          dryStandard: Number(dryStandard) || 12,
          isAffected: Number(readingValue) > (Number(dryStandard) || 12)
        };

        updatedJob = {
          ...updatedJob,
          moistureReadings: [...updatedJob.moistureReadings, newReading]
        };

        setRecentToolActivity(`✓ Moisture: ${newReading.substrate} (${newReading.readingValue}${newReading.unit})`);
        setVoiceHistory(prev => [
          { timestamp: new Date().toLocaleTimeString(), action: 'Moisture Reading', details: `${targetRoom} - ${newReading.substrate}: ${newReading.readingValue}${newReading.unit}` },
          ...prev
        ]);
        responseContent = { status: 'success', reading: newReading };

      } else if (name === 'record_thermal_reading') {
        const { roomName, deltaTFahrenheit, perimeterBoundaryDesc } = args;
        const targetRoom = roomName || activeRoom || 'Loss Area';
        const deltaVal = Number(deltaTFahrenheit) || -4.5;
        const newThermal: ThermalReading = {
          id: `th-${Date.now()}`,
          roomName: targetRoom,
          deltaTFahrenheit: deltaVal,
          perimeterBoundaryDesc: perimeterBoundaryDesc || 'Thermal boundary anomaly',
          hotspotOrCold: deltaVal < 0 ? 'evaporative_cooling' : 'thermal_bridge'
        };

        updatedJob = {
          ...updatedJob,
          thermalReadings: [...updatedJob.thermalReadings, newThermal]
        };

        setRecentToolActivity(`✓ Thermal: ${newThermal.deltaTFahrenheit}°F in ${targetRoom}`);
        responseContent = { status: 'success', thermal: newThermal };

      } else if (name === 'deploy_equipment') {
        const { airMovers, dehumidifiers, airScrubbers, dryingDays } = args;
        updatedJob = {
          ...updatedJob,
          equipment: {
            ...updatedJob.equipment,
            airMovers: airMovers !== undefined ? Number(airMovers) : updatedJob.equipment.airMovers,
            dehumidifiers: dehumidifiers !== undefined ? Number(dehumidifiers) : updatedJob.equipment.dehumidifiers,
            airScrubbers: airScrubbers !== undefined ? Number(airScrubbers) : updatedJob.equipment.airScrubbers,
            dryingDays: dryingDays !== undefined ? Number(dryingDays) : updatedJob.equipment.dryingDays
          }
        };

        setRecentToolActivity(`✓ Equipment Staged: ${airMovers || 0} air movers, ${dehumidifiers || 0} dehus`);
        setVoiceHistory(prev => [
          { timestamp: new Date().toLocaleTimeString(), action: 'Deploy Equipment', details: `${airMovers || 0} AM, ${dehumidifiers || 0} Dehu, ${airScrubbers || 0} Scrubbers` },
          ...prev
        ]);
        responseContent = { status: 'success', equipment: updatedJob.equipment };

      } else if (name === 'add_standardized_action') {
        const { action, notes } = args;
        if (action && !updatedJob.actions.includes(action as StandardizedAction)) {
          updatedJob = {
            ...updatedJob,
            actions: [...updatedJob.actions, action as StandardizedAction],
            technicianNotes: notes ? `${updatedJob.technicianNotes}\n[${action}]: ${notes}`.trim() : updatedJob.technicianNotes
          };
          setRecentToolActivity(`✓ Action added: ${action}`);
        }
        responseContent = { status: 'success', action };

      } else if (name === 'undo_last_action') {
        // Pop last moisture reading or last room
        if (updatedJob.moistureReadings.length > 0) {
          const popped = updatedJob.moistureReadings[updatedJob.moistureReadings.length - 1];
          updatedJob = {
            ...updatedJob,
            moistureReadings: updatedJob.moistureReadings.slice(0, -1)
          };
          setRecentToolActivity(`↩ Reverted: ${popped.substrate}`);
        } else if (updatedJob.dimensions.length > 0) {
          const poppedRoom = updatedJob.dimensions[updatedJob.dimensions.length - 1];
          updatedJob = {
            ...updatedJob,
            dimensions: updatedJob.dimensions.slice(0, -1)
          };
          setRecentToolActivity(`↩ Reverted: ${poppedRoom.roomName}`);
        }
        responseContent = { status: 'success', undone: true };

      } else if (name === 'add_field_notes') {
        const { notes } = args;
        if (notes) {
          updatedJob = {
            ...updatedJob,
            technicianNotes: `${updatedJob.technicianNotes}\n${notes}`.trim()
          };
          setRecentToolActivity(`✓ Note added`);
        }
        responseContent = { status: 'success' };
      }

      functionResponses.push({
        id,
        name,
        response: responseContent
      });
    }

    updatedJob.updatedAt = new Date().toISOString();
    onUpdateJob(updatedJob);

    // Send tool responses back to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'tool_response',
        functionResponses
      }));
    }

    // Auto-dismiss recent activity toast after 4s
    setTimeout(() => {
      setRecentToolActivity(null);
    }, 4500);
  }, [activeRoom, onUpdateJob]);

  // Connect to Gemini Live WebSocket Server
  const connect = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // 1. Get user media with hardware noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });
      mediaStreamRef.current = stream;

      // 2. Setup AudioContext for 16kHz capture
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      inputAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      // Real-time FFT Analyser for Visualizer
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioCtx.destination);

      // Frame visualizer loop
      const updateFrequencies = () => {
        analyser.getByteFrequencyData(dataArray);
        // sample 16 points from spectrum
        const bands: number[] = [];
        const step = Math.floor(dataArray.length / 16);
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          bands.push(Math.round((val / 255) * 100));
        }
        setFrequencies(bands);
        animFrameRef.current = requestAnimationFrame(updateFrequencies);
      };
      updateFrequencies();

      // 3. Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useGeminiLive] Connected to /api/live-ws');
        setIsConnected(true);
        setIsConnecting(false);

        // Send initial job context text prompt
        ws.send(JSON.stringify({
          type: 'text',
          text: `Starting session for Job #${jobRef.current.jobId}. Client: ${jobRef.current.client.name}, Address: ${jobRef.current.client.address}. Current Peril: ${jobRef.current.lossType || 'water'}. Please greet the technician and verify the loss area.`
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'audio' && data.audio) {
            playPcmAudioChunk(data.audio);
          } else if (data.type === 'interrupted') {
            stopPlayback();
          } else if (data.type === 'input_transcript') {
            setLastUserTranscript(data.text);
          } else if (data.type === 'output_transcript') {
            setLastModelTranscript(data.text);
          } else if (data.type === 'tool_call' && data.functionCalls) {
            handleToolCalls(data.functionCalls);
          } else if (data.type === 'error') {
            setConnectionError(data.message);
          }
        } catch (err) {
          console.error('[useGeminiLive] Error parsing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[useGeminiLive] WebSocket error:', err);
        setConnectionError('WebSocket connection error.');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log('[useGeminiLive] WebSocket closed');
        setIsConnected(false);
        setIsConnecting(false);
        stopPlayback();
      };

      // 4. Process live microphone samples and stream to WebSocket
      processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (isMutedRef.current) return;

        const inputBuffer = e.inputBuffer.getChannelData(0);

        // Software Ducking: If Gemini is actively speaking, attenuate mic transmission
        // unless volume exceeds loud threshold (allowing user barge-in)
        if (isModelSpeakingRef.current) {
          let sumSquares = 0;
          for (let i = 0; i < inputBuffer.length; i++) {
            sumSquares += inputBuffer[i] * inputBuffer[i];
          }
          const rms = Math.sqrt(sumSquares / inputBuffer.length);
          if (rms < 0.25) {
            return; // Gate mic during assistant turn to prevent speaker feedback loop
          }
        }

        // Noise Gating for loud job sites
        if (noiseGateLoudSiteRef.current) {
          let sumSquares = 0;
          for (let i = 0; i < inputBuffer.length; i++) {
            sumSquares += inputBuffer[i] * inputBuffer[i];
          }
          const rms = Math.sqrt(sumSquares / inputBuffer.length);
          if (rms < 0.08) {
            return; // Filter out background dehumidifier hum
          }
        }

        const base64Pcm = pcmFloat32ToBase64(inputBuffer);
        ws.send(JSON.stringify({
          type: 'audio',
          audio: base64Pcm
        }));
      };

    } catch (err: any) {
      console.error('[useGeminiLive] Connection failed:', err);
      setConnectionError(err?.message || 'Microphone access denied or connection failed.');
      setIsConnecting(false);
    }
  }, [handleToolCalls]);

  // Disconnect & cleanup
  const disconnect = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    stopPlayback();

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setFrequencies(new Array(16).fill(0));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Undo manual trigger
  const triggerUndo = () => {
    handleToolCalls([{
      name: 'undo_last_action',
      args: { targetType: 'last_action' }
    }]);
  };

  return {
    isConnected,
    isConnecting,
    isMuted,
    isSpeakerMuted,
    activeRoom,
    frequencies,
    lastUserTranscript,
    lastModelTranscript,
    recentToolActivity,
    connectionError,
    voiceHistory,
    connect,
    disconnect,
    toggleMute: () => setIsMuted(prev => !prev),
    toggleSpeaker: () => setIsSpeakerMuted(prev => !prev),
    triggerUndo,
    setActiveRoom
  };
}
