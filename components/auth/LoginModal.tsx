'use client';

import React, { useState } from 'react';
import { UserAccount, UserRole } from '@/lib/types';
import { DEMO_USERS } from '@/lib/mockData';
import {
  X,
  ShieldCheck,
  Building2,
  Briefcase,
  Wrench,
  User,
  ArrowRight,
  Lock,
  Mail,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onSelectUser: (user: UserAccount) => void;
}

export function LoginModal({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}: LoginModalProps) {
  const [selectedRoleTab, setSelectedRoleTab] = useState<UserRole>(currentUser.role);
  const [emailInput, setEmailInput] = useState(currentUser.email);
  const [passwordInput, setPasswordInput] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);

  if (!isOpen) return null;

  const handleQuickDemoSelect = (user: UserAccount) => {
    setSelectedRoleTab(user.role);
    setEmailInput(user.email);
    onSelectUser(user);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === emailInput.toLowerCase() ||
        u.role === selectedRoleTab
    );
    if (matched) {
      onSelectUser(matched);
    } else {
      // Create guest profile for custom input
      onSelectUser({
        id: 'custom-' + Date.now(),
        name: emailInput.split('@')[0],
        email: emailInput,
        role: selectedRoleTab,
        title: `${selectedRoleTab.replace('_', ' ').toUpperCase()}`,
        companyName: 'Alert Disaster Restoration',
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B192C] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xl">
              DS
            </div>
            <div>
              <h2 className="text-lg font-bold">DryScope Universal Login</h2>
              <p className="text-xs text-slate-300">
                Multi-Role Disaster Restoration Authentication Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 1-Click Instant Demo Access Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                1-Click Instant Demo Credentials
              </span>
              <span className="text-[11px] text-slate-400">Click any role to test instantly</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_USERS.map((user) => {
                const isSelected = user.id === currentUser.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => handleQuickDemoSelect(user)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        user.role === 'superadmin'
                          ? 'bg-purple-100 text-purple-700'
                          : user.role === 'owner'
                          ? 'bg-blue-100 text-blue-800'
                          : user.role === 'office_staff'
                          ? 'bg-emerald-100 text-emerald-800'
                          : user.role === 'sales_technician'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {user.role === 'superadmin' && <ShieldCheck className="w-4 h-4" />}
                      {user.role === 'owner' && <Building2 className="w-4 h-4" />}
                      {user.role === 'office_staff' && <Briefcase className="w-4 h-4" />}
                      {user.role === 'sales_technician' && <Wrench className="w-4 h-4" />}
                      {user.role === 'client' && <User className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {user.name}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-emerald-700 capitalize">
                        {user.role.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">
                Or Sign In With Custom Credentials
              </span>
            </div>
          </div>

          {/* Role Tab Selector */}
          <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-100 mb-4 text-xs font-semibold">
            {(
              [
                ['superadmin', 'Superadmin'],
                ['owner', 'Owner'],
                ['office_staff', 'Office'],
                ['sales_technician', 'Sales Tech'],
                ['client', 'Client'],
              ] as [UserRole, string][]
            ).map(([role, label]) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setSelectedRoleTab(role);
                  const demo = DEMO_USERS.find((u) => u.role === role);
                  if (demo) setEmailInput(demo.email);
                }}
                className={`flex-1 py-1.5 rounded-md transition-all text-center ${
                  selectedRoleTab === role
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Authorized Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  placeholder="name@alertdisaster.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Password / Access Token
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[11px] text-emerald-600 hover:underline">
                  Forgot access?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Remember this device on-site
              </label>

              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0B192C] hover:bg-slate-900 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-950/20"
              >
                <span>Authorize & Enter</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
