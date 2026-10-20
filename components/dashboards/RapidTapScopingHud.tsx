'use client';

import React, { useState } from 'react';
import {
  Layers,
  Wrench,
  Check,
  Plus,
  Minus,
  Maximize2,
  Droplets,
  Wind,
  ShieldCheck,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { RestorationJob, StandardizedAction, RoomDimension } from '@/lib/types';
import { playConfirmationChime, playTapTone, speakAssistantFeedback } from '@/lib/audioChime';

interface RapidTapScopingHudProps {
  job: RestorationJob;
  onUpdateJob: (updated: RestorationJob) => void;
  onScopingSaved?: (message: string) => void;
}

const COMMON_ROOMS = [
  'Master Bedroom',
  'Living Room',
  'Kitchen',
  'Basement Area',
  'Master Bathroom',
  'Guest Bedroom',
  'Dining Room',
  'Hallway',
];

const STANDARD_ACTIONS: { id: StandardizedAction; label: string; desc: string }[] = [
  { id: 'FLOOD_CUT', label: 'Flood Cut', desc: 'Controlled drywall demolition' },
  { id: 'REMOVE_BASEBOARD', label: 'Remove Baseboard', desc: 'Pull trim along perimeter' },
  { id: 'REMOVE_FLOORING', label: 'Remove Flooring', desc: 'Demo wet carpet/pad/hardwood' },
  { id: 'EXTRACT_WATER', label: 'Extract Water', desc: 'Standing water truckmount extraction' },
  { id: 'DEPLOY_EQUIPMENT', label: 'Deploy Equipment', desc: 'Place air movers and LGR dehus' },
  { id: 'HEPA_VACUUM', label: 'HEPA Vacuum', desc: 'Filter particulate & mold spores' },
  { id: 'APPLY_ANTIMICROBIAL', label: 'Antimicrobial', desc: 'EPA registered botanical wash' },
];

export function RapidTapScopingHud({
  job,
  onUpdateJob,
  onScopingSaved,
}: RapidTapScopingHudProps) {
  const [selectedRoom, setSelectedRoom] = useState<string>('Master Bedroom');
  const [customRoomInput, setCustomRoomInput] = useState<string>('');
  const [lengthFt, setLengthFt] = useState<number>(14);
  const [widthFt, setWidthFt] = useState<number>(12);
  const [heightFt, setHeightFt] = useState<number>(8);
  const [floodCutHeight, setFloodCutHeight] = useState<number>(24);
  const [selectedActions, setSelectedActions] = useState<StandardizedAction[]>([
    'FLOOD_CUT',
    'REMOVE_BASEBOARD',
    'DEPLOY_EQUIPMENT',
  ]);
  const [airMoversToAdd, setAirMoversToAdd] = useState<number>(3);
  const [dehusToAdd, setDehusToAdd] = useState<number>(1);
  const [scrubbersToAdd, setScrubbersToAdd] = useState<number>(0);
  const [speakConfirmation, setSpeakConfirmation] = useState<boolean>(true);
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(null);

  const activeRoomName = customRoomInput.trim() || selectedRoom;
  const calculatedPerimeter = (lengthFt + widthFt) * 2;
  const estimatedBaseboardLF = Math.max(10, calculatedPerimeter - 6); // subtract door opening

  const toggleAction = (actionId: StandardizedAction) => {
    playTapTone();
    setSelectedActions((prev) =>
      prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId]
    );
  };

  const handleApplyToScope = () => {
    playConfirmationChime();

    const newDimension: RoomDimension = {
      roomName: activeRoomName,
      lengthFt,
      widthFt,
      heightFt,
      floodCutHeightInches: floodCutHeight > 0 ? floodCutHeight : undefined,
      linearFtBaseboard: estimatedBaseboardLF,
    };

    // Merge or replace room dimensions
    const existingIndex = job.dimensions.findIndex(
      (d) => d.roomName.toLowerCase() === activeRoomName.toLowerCase()
    );
    let updatedDimensions = [...job.dimensions];
    if (existingIndex >= 0) {
      updatedDimensions[existingIndex] = newDimension;
    } else {
      updatedDimensions.push(newDimension);
    }

    // Merge standardized actions (no duplicates)
    const updatedActions = Array.from(new Set([...job.actions, ...selectedActions]));

    // Increment equipment
    const updatedEquipment = {
      ...job.equipment,
      airMovers: job.equipment.airMovers + airMoversToAdd,
      dehumidifiers: job.equipment.dehumidifiers + dehusToAdd,
      airScrubbers: job.equipment.airScrubbers + scrubbersToAdd,
    };

    const updatedJob: RestorationJob = {
      ...job,
      dimensions: updatedDimensions,
      actions: updatedActions,
      equipment: updatedEquipment,
      updatedAt: new Date().toISOString(),
    };

    onUpdateJob(updatedJob);

    const confirmationText = `${activeRoomName} saved: ${lengthFt} by ${widthFt} with ${
      floodCutHeight > 0 ? `${floodCutHeight}-inch flood cut` : 'no flood cut'
    }, ${airMoversToAdd} air movers, ${dehusToAdd} dehu.`;

    setLastSavedNotice(confirmationText);
    setTimeout(() => setLastSavedNotice(null), 4000);

    if (speakConfirmation) {
      speakAssistantFeedback(confirmationText);
    }

    if (onScopingSaved) {
      onScopingSaved(confirmationText);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      {/* HUD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Rapid-Tap Scoping HUD
            </h3>
            <p className="text-[11px] text-slate-500">
              One-handed touch entry for fast room dimensions, standard directives, and equipment.
            </p>
          </div>
        </div>

        {/* Audio feedback toggle */}
        <button
          type="button"
          onClick={() => setSpeakConfirmation(!speakConfirmation)}
          className={`self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            speakConfirmation
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-slate-100 text-slate-500'
          }`}
          title="Toggle verbal audio confirmation"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{speakConfirmation ? 'Spoken Chime On' : 'Muted'}</span>
        </button>
      </div>

      {/* 1. Quick Room Carousel */}
      <div>
        <label className="text-xs font-bold text-slate-700 block mb-2">
          1. Select or Name Loss Area
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {COMMON_ROOMS.map((room) => {
            const isSelected = selectedRoom === room && !customRoomInput.trim();
            return (
              <button
                key={room}
                type="button"
                onClick={() => {
                  playTapTone();
                  setSelectedRoom(room);
                  setCustomRoomInput('');
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B192C] text-white shadow-md shadow-slate-900/10 scale-[1.02]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {room}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={customRoomInput}
          onChange={(e) => setCustomRoomInput(e.target.value)}
          placeholder="Or type custom zone (e.g. Crawlspace NW, Server Closet, Upstairs Hall)"
          className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* 2. Room Dimensions Stepper Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {/* Length Stepper */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Length (L)</span>
            <span className="font-mono font-black text-amber-700 text-sm">{lengthFt} ft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playTapTone();
                setLengthFt((prev) => Math.max(4, prev - 1));
              }}
              className="min-h-[44px] min-w-[44px] rounded-lg bg-white border border-slate-300 text-slate-800 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 flex gap-1 justify-center">
              {[10, 12, 14, 16, 20].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    playTapTone();
                    setLengthFt(val);
                  }}
                  className={`min-h-[44px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    lengthFt === val
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {val}&apos;
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                playTapTone();
                setLengthFt((prev) => prev + 1);
              }}
              className="min-h-[44px] min-w-[44px] rounded-lg bg-white border border-slate-300 text-slate-800 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Width Stepper */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Width (W)</span>
            <span className="font-mono font-black text-amber-700 text-sm">{widthFt} ft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playTapTone();
                setWidthFt((prev) => Math.max(4, prev - 1));
              }}
              className="min-h-[44px] min-w-[44px] rounded-lg bg-white border border-slate-300 text-slate-800 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 flex gap-1 justify-center">
              {[8, 10, 12, 14, 16].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    playTapTone();
                    setWidthFt(val);
                  }}
                  className={`min-h-[44px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    widthFt === val
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {val}&apos;
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                playTapTone();
                setWidthFt((prev) => prev + 1);
              }}
              className="min-h-[44px] min-w-[44px] rounded-lg bg-white border border-slate-300 text-slate-800 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ceiling Height */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Ceiling Height</span>
            <span className="font-mono font-black text-slate-900 text-sm">{heightFt} ft</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[8, 9, 10, 12].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  playTapTone();
                  setHeightFt(h);
                }}
                className={`min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  heightFt === h
                    ? 'bg-[#0B192C] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {h}&apos;
              </button>
            ))}
          </div>
        </div>

        {/* Flood Cut Height */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Flood Cut Height</span>
            <span className="font-mono font-black text-amber-700 text-sm">
              {floodCutHeight === 0 ? 'None' : `${floodCutHeight}"`}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { val: 0, label: '0"' },
              { val: 12, label: '12"' },
              { val: 24, label: '24"' },
              { val: 48, label: '48"' },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  playTapTone();
                  setFloodCutHeight(opt.val);
                  if (opt.val > 0 && !selectedActions.includes('FLOOD_CUT')) {
                    setSelectedActions((prev) => [...prev, 'FLOOD_CUT']);
                  }
                }}
                className={`min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  floodCutHeight === opt.val
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. IICRC Standard Directives Palette */}
      <div>
        <label className="text-xs font-bold text-slate-700 block mb-2">
          2. Standard Action Directives (IICRC S500 / S520)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {STANDARD_ACTIONS.map((action) => {
            const isSelected = selectedActions.includes(action.id);
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => toggleAction(action.id)}
                className={`min-h-[48px] p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="text-xs font-bold leading-tight">{action.label}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">{action.desc}</div>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ml-1.5 ${
                    isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Equipment Steppers (Air Movers, Dehus, Scrubbers) */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <label className="text-xs font-bold text-slate-700 block mb-2.5">
          3. Immediate Equipment Placement for {activeRoomName}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Air Movers */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Air Movers</span>
              <span className="text-[10px] text-slate-400">Centrifugal / Axial</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playTapTone();
                  setAirMoversToAdd((prev) => Math.max(0, prev - 1));
                }}
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="font-mono font-black text-slate-900 text-sm w-5 text-center">
                {airMoversToAdd}
              </span>
              <button
                type="button"
                onClick={() => {
                  playTapTone();
                  setAirMoversToAdd((prev) => prev + 1);
                }}
                className="w-8 h-8 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* LGR Dehumidifiers */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">LGR Dehus</span>
              <span className="text-[10px] text-slate-400">Refrigerant Units</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playTapTone();
                  setDehusToAdd((prev) => Math.max(0, prev - 1));
                }}
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="font-mono font-black text-slate-900 text-sm w-5 text-center">
                {dehusToAdd}
              </span>
              <button
                type="button"
                onClick={() => {
                  playTapTone();
                  setDehusToAdd((prev) => prev + 1);
                }}
                className="w-8 h-8 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* HEPA Scrubbers */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">HEPA Scrubbers</span>
              <span className="text-[10px] text-slate-400">Air Filtration</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playTapTone();
                  setScrubbersToAdd((prev) => Math.max(0, prev - 1));
                }}
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="font-mono font-black text-slate-900 text-sm w-5 text-center">
                {scrubbersToAdd}
              </span>
              <button
                type="button"
                onClick={() => {
                  playTapTone();
                  setScrubbersToAdd((prev) => prev + 1);
                }}
                className="w-8 h-8 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Primary CTA Button (48px Touch Target with Thumb Zone Focus) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleApplyToScope}
          className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-[#0B192C] hover:bg-slate-900 text-white font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-slate-950/20 active:scale-[0.99] cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Apply {activeRoomName} & Directives to Active Scope</span>
        </button>
      </div>

      {lastSavedNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>✓ {lastSavedNotice}</span>
        </div>
      )}
    </div>
  );
}
