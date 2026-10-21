'use client';

import React from 'react';
import { UserAccount, UserRole, RestorationJob } from '@/lib/types';
import { STAFF_ROLES, homeViewForRole } from '@/lib/roles';
import {
  ShieldAlert,
  Building2,
  Briefcase,
  Wrench,
  User,
  Printer,
  ChevronDown,
  Sparkles,
  FileSpreadsheet,
  LogIn,
  LogOut,
  MapPin,
  TrendingUp,
  Archive,
} from 'lucide-react';

interface NavbarProps {
  // null when nobody is signed in
  currentUser: UserAccount | null;
  activeJob?: RestorationJob;
  jobs: RestorationJob[];
  onSelectJob: (job: RestorationJob) => void;
  onOpenLoginModal: () => void;
  onSignOut: () => void;
  onOpenDocSuite: () => void;
  currentView: string;
  onChangeView: (view: string) => void;
  canOpenView: (view: string) => boolean;
  isCloudConnected?: boolean;
}

export function Navbar({
  currentUser,
  activeJob,
  jobs,
  onSelectJob,
  onOpenLoginModal,
  onSignOut,
  onOpenDocSuite,
  currentView,
  onChangeView,
  canOpenView,
  isCloudConnected = true,
}: NavbarProps) {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return {
          label: 'Superadmin',
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: ShieldAlert,
        };
      case 'owner':
        return {
          label: 'Owner / Exec',
          bg: 'bg-blue-100 text-blue-900 border-blue-200',
          icon: Building2,
        };
      case 'office_staff':
        return {
          label: 'Office Estimator',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          icon: Briefcase,
        };
      case 'sales_technician':
        return {
          label: 'Sales Tech (Field)',
          bg: 'bg-amber-100 text-amber-900 border-amber-200',
          icon: Wrench,
        };
      case 'client':
        return {
          label: 'Client (Homeowner)',
          bg: 'bg-teal-100 text-teal-900 border-teal-200',
          icon: User,
        };
    }
  };

  const badge = currentUser ? getRoleBadge(currentUser.role) : null;
  const BadgeIcon = badge?.icon;
  // Superadmins can preview each role's dashboard; this switches views only,
  // never the signed-in identity or its permissions
  const canPreviewRoles = currentUser?.role === 'superadmin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md transition-all shadow-xs print:hidden">
      {/* Top Banner: 1-Click Role Switcher bar for rapid evaluation */}
      {canPreviewRoles && (
      <div className="bg-slate-900 text-white px-3 sm:px-6 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300">Role Preview:</span>
          <span className="hidden md:inline text-slate-400 text-[11px]">
            Open each role&apos;s dashboard as superadmin:
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5">
          {[...STAFF_ROLES, 'client' as const].map((role) => {
            const roleView = homeViewForRole(role);
            const isCurrent = currentView === roleView;
            return (
              <button
                key={role}
                onClick={() => onChangeView(roleView)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={`Preview the ${role.replace('_', ' ')} dashboard`}
              >
                {role === 'superadmin' && '🛡️ Admin'}
                {role === 'owner' && '🏢 Owner'}
                {role === 'office_staff' && '💼 Office'}
                {role === 'sales_technician' && '⚡ Tech'}
                {role === 'client' && '🏡 Client'}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Main App Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity: Deep Navy + Crisp Emerald Green */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChangeView('landing')}
            className="flex items-center gap-2 text-left group focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B192C] to-[#1E3A8A] flex items-center justify-center text-white shadow-md shadow-blue-950/20 group-hover:scale-105 transition-transform">
              <span className="font-black text-xl tracking-tight text-white">D</span>
              <span className="font-black text-xl text-emerald-400">S</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-[#0B192C]">
                  Dry<span className="text-emerald-600">Scope</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  IICRC S500
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                Disaster Mitigation & Field Scoping Platform
              </p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 pl-4 border-l border-slate-200">
            {canOpenView('landing') && (
            <button
              onClick={() => onChangeView('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                currentView === 'landing'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Overview
            </button>
            )}
            {canOpenView('tech_pipeline') && (
            <button
              onClick={() => onChangeView('tech_pipeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                currentView === 'tech_pipeline'
                  ? 'bg-amber-100 text-amber-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Sales Pipeline
            </button>
            )}
            {canOpenView('tech') && (
            <button
              onClick={() => onChangeView('tech')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                currentView === 'tech'
                  ? 'bg-amber-100 text-amber-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Field Scoping
            </button>
            )}
            {canOpenView('office') && (
            <button
              onClick={() => onChangeView('office')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                currentView === 'office'
                  ? 'bg-emerald-100 text-emerald-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Office Matrix
            </button>
            )}
            {canOpenView('office_archive') && (
            <button
              onClick={() => onChangeView('office_archive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                currentView === 'office_archive'
                  ? 'bg-emerald-100 text-emerald-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Archive Vault
            </button>
            )}
            {canOpenView('owner') && (
            <button
              onClick={() => onChangeView('owner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                currentView === 'owner'
                  ? 'bg-blue-100 text-blue-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Executive
            </button>
            )}
            {canOpenView('client') && (
            <button
              onClick={() => onChangeView('client')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                currentView === 'client'
                  ? 'bg-teal-100 text-teal-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Client Portal
            </button>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Sync Status Indicator */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isCloudConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={isCloudConnected ? 'Connected to Firebase Firestore Cloud' : 'Local Offline Cache Mode'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{isCloudConnected ? 'Cloud Synced' : 'Offline Mode'}</span>
          </div>

          {/* Active Job Selector */}
          {activeJob && (
          <div className="relative hidden md:block">
            <select
              value={activeJob.id}
              onChange={(e) => {
                const selected = jobs.find((j) => j.id === e.target.value);
                if (selected) onSelectJob(selected);
              }}
              aria-label="Active Job Selection"
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-lg pl-3 pr-8 py-2 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobId} - {j.client.name} ({j.category})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          )}

          {/* Document Suite Trigger */}
          {activeJob && (
          <button
            onClick={onOpenDocSuite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors border border-slate-200 shadow-2xs"
            title="Generate Official 4-Document Suite and PDF Printout"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">4-Doc Suite / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          )}

          {/* Current User Badge & Sign In / Out */}
          {currentUser && badge && BadgeIcon ? (
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${badge.bg}`}
                title={currentUser.email}
              >
                <BadgeIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
                <span className="text-[10px] opacity-75">({badge.label})</span>
              </span>

              <button
                onClick={onSignOut}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B192C] hover:bg-slate-900 text-white text-xs font-bold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
