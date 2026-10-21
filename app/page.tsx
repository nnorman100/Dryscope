'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RestorationJob } from '@/lib/types';
import { INITIAL_JOBS } from '@/lib/mockData';
import { Navbar } from '@/components/Navbar';
import { LandingPage } from '@/components/landing/LandingPage';
import { TechPipelineDashboard } from '@/components/dashboards/TechPipelineDashboard';
import { TechFieldDashboard } from '@/components/dashboards/TechFieldDashboard';
import { OfficeDashboard } from '@/components/dashboards/OfficeDashboard';
import { OfficeArchiveVault } from '@/components/dashboards/OfficeArchiveVault';
import { OwnerDashboard } from '@/components/dashboards/OwnerDashboard';
import { SuperadminDashboard } from '@/components/dashboards/SuperadminDashboard';
import { ClientPortal } from '@/components/dashboards/ClientPortal';
import { LoginModal } from '@/components/auth/LoginModal';
import { ClientAccessNotice } from '@/components/auth/ClientAccessNotice';
import { DocumentSuiteModal } from '@/components/documents/DocumentSuiteModal';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import {
  subscribeToJobs,
  subscribeToClientJobs,
  syncJobToFirestore,
  seedJobsIfEmpty,
  testConnection,
} from '@/lib/firebase';
import { AuthProvider, useAuth } from '@/lib/auth';
import { canOpenView, homeViewForRole, isStaffRole } from '@/lib/roles';
import { Loader2 } from 'lucide-react';

const LOCAL_STORAGE_KEY_JOBS = 'dryscope_restoration_jobs_v1';
// Held the demo role picker's user before real sign-in; cleared on load
const LEGACY_LOCAL_STORAGE_KEY_USER = 'dryscope_current_user_v1';

function readUrlParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    // Older client portal links used ?role=client instead of ?view=client
    if (name === 'view' && !params.get('view') && params.get('role') === 'client') return 'client';
    return params.get(name);
  } catch {
    return null;
  }
}

function readSavedJobs(): RestorationJob[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_JOBS) || 'null');
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export default function Page() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
}

function Home() {
  const { status, account, emailVerified, signOut } = useAuth();
  const role = account?.role;
  const isStaff = isStaffRole(role);

  // Jobs and the chosen view are kept per signed-in user, so signing out or
  // switching accounts never shows the previous person's data or screen
  const [jobsState, setJobsState] = useState<{ uid: string; jobs: RestorationJob[] } | null>(null);
  const [viewChoice, setViewChoice] = useState<{ uid: string; view: string } | null>(null);
  // A view asked for before sign-in (from ?view= or a landing page button),
  // opened once we know the user's role allows it
  const [requestedView, setRequestedView] = useState<string | null>(() => readUrlParam('view'));
  const [activeJobId, setActiveJobId] = useState<string>(() => readUrlParam('jobId') || INITIAL_JOBS[0].id);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isDocSuiteOpen, setIsDocSuiteOpen] = useState<boolean>(false);
  const [docSuiteTargetJob, setDocSuiteTargetJob] = useState<RestorationJob | null>(null);

  const uid = account?.id;
  const tenantId = account?.tenantId;

  // Before the first update for this user: staff start from their saved jobs
  // (or the demo jobs), clients from nothing until their own jobs load
  const jobs = useMemo(() => {
    if (jobsState && jobsState.uid === uid) return jobsState.jobs;
    if (isStaff) return readSavedJobs() || INITIAL_JOBS;
    return role === 'client' ? [] : INITIAL_JOBS;
  }, [jobsState, uid, isStaff, role]);

  const setJobs = useCallback(
    (update: RestorationJob[] | ((prev: RestorationJob[]) => RestorationJob[])) => {
      if (!uid) return;
      setJobsState((prev) => {
        const base =
          prev && prev.uid === uid ? prev.jobs : isStaff ? readSavedJobs() || INITIAL_JOBS : [];
        return { uid, jobs: typeof update === 'function' ? update(base) : update };
      });
    },
    [uid, isStaff]
  );

  let currentView = 'landing';
  if (role) {
    const chosen = viewChoice && viewChoice.uid === uid ? viewChoice.view : requestedView;
    currentView = chosen && canOpenView(role, chosen) ? chosen : homeViewForRole(role);
  } else if (viewChoice && !viewChoice.uid) {
    currentView = viewChoice.view;
  }

  // The demo role picker's saved user is meaningless now that sign-in is real
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY_USER);
    } catch (e) {}
  }, []);

  // Never leave the company's jobs cached on a device nobody is signed in to
  useEffect(() => {
    if (status === 'signed_out') {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY_JOBS);
      } catch (e) {}
    }
  }, [status]);

  // Live jobs for whoever is signed in: staff get their own company's jobs,
  // clients only the jobs carrying their verified email, at any company
  useEffect(() => {
    if (status !== 'signed_in' || !role) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    if (isStaffRole(role)) {
      // A superadmin who isn't placed in a company has no jobs to load
      if (!tenantId) return;
      testConnection()
        .then(() => {
          if (cancelled) return;
          setIsCloudConnected(true);
          seedJobsIfEmpty(tenantId, INITIAL_JOBS).catch(console.warn);
          unsubscribe = subscribeToJobs(
            tenantId,
            (cloudJobs) => {
              if (Array.isArray(cloudJobs) && cloudJobs.length > 0) {
                setJobs(cloudJobs);
              }
            },
            (err) => {
              console.warn('Firestore subscription fallback:', err);
            }
          );
        })
        .catch(() => {
          setIsCloudConnected(false);
        });
    } else if (emailVerified && account?.email) {
      unsubscribe = subscribeToClientJobs(account.email, setJobs, (err) => {
        console.warn('Could not load client jobs:', err);
      });
    }

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [status, role, tenantId, account?.email, emailVerified, setJobs]);

  // Cache staff jobs locally once they have changed for this user. Clients
  // never cache jobs on the device.
  useEffect(() => {
    if (isStaff && jobsState && jobsState.uid === uid) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_JOBS, JSON.stringify(jobsState.jobs));
      } catch (e) {}
    }
  }, [jobsState, uid, isStaff]);

  const changeView = (view: string) => {
    if (!role) {
      // Signed out: anything past the landing page needs sign-in first
      if (view === 'landing') {
        setViewChoice({ uid: '', view: 'landing' });
      } else {
        setRequestedView(view);
        setIsLoginModalOpen(true);
      }
      return;
    }
    setViewChoice({ uid: uid!, view: canOpenView(role, view) ? view : homeViewForRole(role) });
  };

  const handleSignOut = () => {
    setRequestedView(null);
    signOut().catch(console.warn);
  };

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  // Jobs loaded from Firestore carry their company; local demo jobs get the
  // signed-in staff member's company when first saved
  const withTenant = (job: RestorationJob): RestorationJob =>
    job.tenantId || !tenantId ? job : { ...job, tenantId };

  const handleUpdateJob = (edited: RestorationJob) => {
    const updated = withTenant(edited);
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    // Immediate reactive write to Firestore cloud
    syncJobToFirestore(updated).catch((err) => {
      console.warn('Cloud sync error (queued locally):', err);
    });
  };

  const handleCreateNewEstimate = (customJob?: Partial<RestorationJob>) => {
    const newJob: RestorationJob = {
      id: `job-${Date.now()}`,
      tenantId,
      jobId: customJob?.jobId || `DS-2026-${Math.floor(Math.random() * 800 + 200)}`,
      status: 'Draft',
      isArchived: false,
      category: customJob?.category || 'Cat 1 (Clean)',
      finishType: customJob?.finishType || 'Finished',
      cabinetryMultiplier: false,
      afterHours: false,
      client: {
        name: customJob?.client?.name || 'New Client Loss',
        email: customJob?.client?.email || 'client@example.com',
        phone: customJob?.client?.phone || '(555) 234-9988',
        address: customJob?.client?.address || '100 Main Street',
        cityStateZip: customJob?.client?.cityStateZip || 'Eugene, OR 97401',
        insuranceCarrier: customJob?.client?.insuranceCarrier || 'State Farm',
        policyNumber: customJob?.client?.policyNumber || 'SF-PENDING',
        claimNumber: customJob?.client?.claimNumber || `CLM-${Math.floor(Math.random() * 90000 + 10000)}`,
        deductible: customJob?.client?.deductible ?? 1000,
      },
      dimensions: [
        {
          roomName: 'Main Affected Area',
          lengthFt: 14,
          widthFt: 10,
          heightFt: 8,
          affectedFloorSqFt: 140,
          floodCutHeightInches: 24,
          linearFtBaseboard: 48,
        },
      ],
      actions: ['EXTRACT_WATER', 'DEPLOY_EQUIPMENT', 'REMOVE_BASEBOARD'],
      moistureReadings: [],
      thermalReadings: [],
      psychrometricLogs: [],
      equipment: {
        airMovers: 4,
        dehumidifiers: 1,
        airScrubbers: 0,
        woodFloorSystems: 0,
        dryingDays: 3,
        techHoursOnSite: 4,
        monitoringHoursPerDay: 1,
      },
      photos: [],
      technicianNotes: customJob?.technicianNotes || 'Emergency field intake initiated.',
      rawTranscript: '',
      signature: {
        isSigned: false,
        termsAccepted: false,
      },
      gpsCoordinates: customJob?.gpsCoordinates,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTechId: account?.id || '',
    };

    setJobs((prev) => [newJob, ...prev]);
    setActiveJobId(newJob.id);
    changeView('tech');
    syncJobToFirestore(newJob).catch(console.warn);
  };

  const handleRestoreArchivedJob = (archived: RestorationJob) => {
    const restored: RestorationJob = withTenant({
      ...archived,
      id: `job-restored-${Date.now()}`,
      jobId: `${archived.jobId}-REV`,
      status: 'Ready for Review',
      isArchived: false,
      archivedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      technicianNotes: `Supplementary claim revision restored from archived record ${archived.jobId}.`,
    });

    setJobs((prev) => [restored, ...prev]);
    setActiveJobId(restored.id);
    changeView('office');
    syncJobToFirestore(restored).catch(console.warn);
  };

  const handleOpenDocSuiteForJob = (target?: RestorationJob) => {
    const job = target || activeJob;
    if (!job) return;
    setDocSuiteTargetJob(job);
    setIsDocSuiteOpen(true);
  };

  const docSuiteJob = docSuiteTargetJob || activeJob;

  const clientHasNothingToSee = role === 'client' && jobs.length === 0;

  return (
    <GoogleMapsProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Universal Navbar */}
      <Navbar
        currentUser={account}
        activeJob={role ? activeJob : undefined}
        jobs={jobs.filter((j) => !j.isArchived)}
        onSelectJob={(j) => setActiveJobId(j.id)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenDocSuite={() => handleOpenDocSuiteForJob(activeJob)}
        currentView={currentView}
        onChangeView={changeView}
        canOpenView={(view) => (role ? canOpenView(role, view) : view === 'landing')}
        isCloudConnected={isCloudConnected}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {status === 'loading' && (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking sign-in…
          </div>
        )}

        {status !== 'loading' && currentView === 'landing' && (
          <LandingPage
            onNavigate={changeView}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* 1. Sales Technician Dedicated Pipeline Dashboard */}
        {isStaff && currentView === 'tech_pipeline' && (
          <TechPipelineDashboard
            jobs={jobs}
            activeJob={activeJob}
            onSelectJob={(j) => setActiveJobId(j.id)}
            onOpenScopingWorkspace={(j) => {
              if (j) setActiveJobId(j.id);
              changeView('tech');
            }}
            onCreateNewEstimate={handleCreateNewEstimate}
            onNavigateToPortal={() => changeView('client')}
          />
        )}

        {/* 2. Sales Technician Dedicated Job Scoping Workspace */}
        {isStaff && activeJob && currentView === 'tech' && (
          <TechFieldDashboard
            job={activeJob}
            onUpdateJob={handleUpdateJob}
            onNavigateToPortal={() => changeView('client')}
            onNavigateToPipeline={() => changeView('tech_pipeline')}
            onOpenDocSuite={() => handleOpenDocSuiteForJob(activeJob)}
          />
        )}

        {/* 3. Office Staff Active Estimating Matrix */}
        {isStaff && activeJob && currentView === 'office' && (
          <OfficeDashboard
            job={activeJob}
            onUpdateJob={handleUpdateJob}
            onOpenDocSuite={() => handleOpenDocSuiteForJob(activeJob)}
            onNavigateToPortal={() => changeView('client')}
            onOpenArchive={() => changeView('office_archive')}
          />
        )}

        {/* 4. Office Staff Dedicated Archived Estimates Vault */}
        {isStaff && currentView === 'office_archive' && (
          <OfficeArchiveVault
            jobs={jobs}
            onSelectJob={(j) => {
              setActiveJobId(j.id);
            }}
            onRestoreJob={handleRestoreArchivedJob}
            onOpenDocSuite={(j) => handleOpenDocSuiteForJob(j)}
            onBackToActive={() => changeView('office')}
          />
        )}

        {/* 5. Owner Executive Command Dashboard */}
        {isStaff && currentView === 'owner' && (
          <OwnerDashboard
            jobs={jobs.filter((j) => !j.isArchived)}
            onSelectJob={(j) => {
              setActiveJobId(j.id);
              changeView('office');
            }}
            onNavigateToOffice={() => changeView('office')}
          />
        )}

        {/* 6. Superadmin Platform Directory & Console */}
        {role === 'superadmin' && currentView === 'superadmin' && <SuperadminDashboard />}

        {/* 7. Client Recovery Portal */}
        {role && currentView === 'client' && clientHasNothingToSee && <ClientAccessNotice />}
        {role && currentView === 'client' && activeJob && (
          <ClientPortal
            job={activeJob}
            onUpdateJob={handleUpdateJob}
            onOpenDocSuite={() => handleOpenDocSuiteForJob(activeJob)}
          />
        )}
      </main>

      {/* Sign-in */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Official 4-Document Suite & PDF Print Modal */}
      {docSuiteJob && (
        <DocumentSuiteModal
          isOpen={isDocSuiteOpen}
          onClose={() => setIsDocSuiteOpen(false)}
          job={docSuiteJob}
        />
      )}
    </div>
  </GoogleMapsProvider>
  );
}
