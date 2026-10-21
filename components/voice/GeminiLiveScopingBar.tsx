'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Droplets,
  Biohazard,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  X,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  History
} from 'lucide-react';
import { RestorationJob, LossPerilType, MoldConditionLevel } from '@/lib/types';
import { useGeminiLive } from '@/hooks/useGeminiLive';

interface GeminiLiveScopingBarProps {
  job: RestorationJob;
  onUpdateJob: (updatedJob: RestorationJob) => void;
  onOpenAssetScanner?: () => void;
}

export function GeminiLiveScopingBar({
  job,
  onUpdateJob,
}: GeminiLiveScopingBarProps) {
  const [isLoudSiteMode, setIsLoudSiteMode] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const {
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
    toggleMute,
    toggleSpeaker,
    triggerUndo,
  } = useGeminiLive({
    job,
    onUpdateJob,
    noiseGateLoudSite: isLoudSiteMode,
  });

  const currentLossType: LossPerilType = job.lossType || 'water';

  const toggleLossPeril = () => {
    const nextType: LossPerilType = currentLossType === 'water' ? 'mold' : 'water';
    const updated: RestorationJob = {
      ...job,
      lossType: nextType,
      category: nextType === 'mold' ? 'Cat 3 (Black / Mold)' : job.category,
      moldCondition: nextType === 'mold' ? 'Condition 3 (Active Microbial Growth)' : undefined,
      containmentRequired: nextType === 'mold',
      updatedAt: new Date().toISOString(),
    };
    onUpdateJob(updated);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 pointer-events-none">
      <div className="pointer-events-auto bg-[#0B192C]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-950/60 overflow-hidden text-white transition-all duration-300">
        {/* Tool Call Activity Toast Alert */}
        {recentToolActivity && (
          <div className="bg-emerald-600/90 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-between border-b border-emerald-500/50 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{recentToolActivity}</span>
            </div>
            <button
              type="button"
              onClick={triggerUndo}
              className="text-[11px] underline hover:text-emerald-100 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Undo
            </button>
          </div>
        )}

        {/* Error Notification */}
        {connectionError && (
          <div className="bg-rose-600/90 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-between border-b border-rose-500/50">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{connectionError}</span>
            </div>
            <button
              type="button"
              onClick={connect}
              className="text-[11px] underline hover:text-rose-100 font-bold"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Minimized Bubble View */}
        {isMinimized ? (
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 animate-pulse'
                    : isConnecting
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-xs font-bold font-mono">Gemini Live Co-Pilot</span>
              {isConnected && (
                <span className="text-[10px] text-slate-300">
                  {currentLossType === 'mold' ? '☣️ Mold (S520)' : '💧 Water (S500)'} • {activeRoom}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isConnected ? (
                <button
                  type="button"
                  onClick={connect}
                  disabled={isConnecting}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  {isConnecting ? 'Connecting...' : 'Start Live Scoping'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={disconnect}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition"
                >
                  End Session
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
                title="Expand Scoping Dock"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Full Expanded Dock */
          <div className="p-4 sm:p-5 space-y-3">
            {/* Top Row: Status, Peril Toggle, Active Room & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                {/* Live Connection Pulse Indicator */}
                <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isConnected
                        ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-500/40'
                        : isConnecting
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
                    {isConnected ? 'GEMINI 3.8 LIVE' : isConnecting ? 'CONNECTING...' : 'LIVE SCOPING'}
                  </span>
                </div>

                {/* Loss Peril Badge Switcher (Water S500 vs. Mold S520) */}
                <button
                  type="button"
                  onClick={toggleLossPeril}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                    currentLossType === 'mold'
                      ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 hover:bg-rose-900/80'
                      : 'bg-sky-950/80 border-sky-500/60 text-sky-300 hover:bg-sky-900/80'
                  }`}
                  title="Click to toggle between Water Damage (IICRC S500) and Mold Remediation (IICRC S520)"
                >
                  {currentLossType === 'mold' ? (
                    <>
                      <Biohazard className="w-3.5 h-3.5 text-rose-400" />
                      <span>Mold Remediation (S520)</span>
                    </>
                  ) : (
                    <>
                      <Droplets className="w-3.5 h-3.5 text-sky-400" />
                      <span>Water Mitigation (S500)</span>
                    </>
                  )}
                </button>

                {/* Active Room Pin */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-slate-300 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 font-mono">
                  <span className="text-slate-400">Room:</span>
                  <span className="font-bold text-white">{activeRoom}</span>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1.5">
                {/* Noise Gate Toggle for Loud Equipment Sites */}
                <button
                  type="button"
                  onClick={() => setIsLoudSiteMode(!isLoudSiteMode)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition border ${
                    isLoudSiteMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Toggle noise gating for loud restoration equipment sites"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{isLoudSiteMode ? 'Loud Site Gate ON' : 'Standard Mic'}</span>
                </button>

                {/* Voice History Modal Toggle */}
                {voiceHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    title="View Voice Scoping Action Log"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Minimize Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                  title="Minimize Dock"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Middle Section: Frequency Audio Visualizer & Real-Time Waveform */}
            <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              {/* Mic Icon Status */}
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-slate-700">
                {isMuted ? (
                  <MicOff className="w-4 h-4 text-rose-400" />
                ) : (
                  <Mic className={`w-4 h-4 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                )}
              </div>

              {/* 16-Channel Waveform Bars */}
              <div className="flex-1 flex items-center justify-between gap-1 h-8 px-2 bg-slate-900/60 rounded-lg border border-slate-800/50">
                {frequencies.map((freq, idx) => {
                  const heightPct = Math.max(8, isConnected ? freq : 8);
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-full transition-all duration-75"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor:
                          currentLossType === 'mold'
                            ? heightPct > 40
                              ? '#f43f5e'
                              : '#fb7185'
                            : heightPct > 40
                            ? '#0284c7'
                            : '#38bdf8',
                        opacity: isConnected ? 0.9 : 0.3,
                      }}
                    />
                  );
                })}
              </div>

              {/* Assistant Audio Status */}
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-slate-700">
                {isSpeakerMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-sky-400" />
                )}
              </div>
            </div>

            {/* Bottom Row: Live Transcript & Session Action Triggers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Live Transcript Ticker */}
              <div className="flex-1 min-w-0 text-xs">
                {lastUserTranscript || lastModelTranscript ? (
                  <div className="space-y-0.5 font-mono truncate">
                    {lastUserTranscript && (
                      <p className="text-slate-300 truncate">
                        <span className="text-emerald-400 font-bold">Tech:</span> {lastUserTranscript}
                      </p>
                    )}
                    {lastModelTranscript && (
                      <p className="text-sky-300 truncate">
                        <span className="text-sky-400 font-bold">Zephyr:</span> {lastModelTranscript}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {isConnected
                      ? 'Speak room dimensions, flood cut heights, moisture readings, or equipment...'
                      : 'Connect to begin real-time hands-free conversational scoping.'}
                  </p>
                )}
              </div>

              {/* Session Control Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {isConnected && (
                  <>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                        isMuted
                          ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                          : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                      }`}
                      title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleSpeaker}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                        isSpeakerMuted
                          ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                          : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                      }`}
                      title={isSpeakerMuted ? 'Unmute Voice Output' : 'Mute Voice Output'}
                    >
                      {isSpeakerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{isSpeakerMuted ? 'Silent' : 'Voice'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={triggerUndo}
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                      title="Undo last voice action"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Undo</span>
                    </button>
                  </>
                )}

                {!isConnected ? (
                  <button
                    type="button"
                    onClick={connect}
                    disabled={isConnecting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 hover:from-emerald-400 hover:to-sky-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    <Radio className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                    <span>{isConnecting ? 'Initializing Gemini...' : 'Start Gemini Live'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={disconnect}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>End Live Session</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Voice Scoping Action Log Drawer */}
            {showHistory && voiceHistory.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                  <span>Voice Scoping Log ({voiceHistory.length} actions)</span>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                {voiceHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 font-mono text-[11px]"
                  >
                    <span className="text-emerald-400 font-bold">{item.action}</span>
                    <span className="text-slate-300 truncate max-w-xs">{item.details}</span>
                    <span className="text-slate-500 text-[10px]">{item.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
