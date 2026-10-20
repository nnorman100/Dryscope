'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { UserAccount, RestorationJob } from '@/lib/types';
import { DEMO_USERS, INITIAL_JOBS } from '@/lib/mockData';
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
import { DocumentSuiteModal } from '@/components/documents/DocumentSuiteModal';
import {
  subscribeToJobs,
  syncJobToFirestore,
  seedJobsIfEmpty,
  testConnection,
} from '@/lib/firebase';

const LOCAL_STORAGE_KEY_JOBS = 'dryscope_restoration_jobs_v1';
const LOCAL_STORAGE_KEY_USER = 'dryscope_current_user_v1';

const emptySubscribe = () => () => {};

export default function Home() {
  const [jobs, setJobs] = useState<RestorationJob[]>(INITIAL_JOBS);
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEMO_USERS[3]);
  const [currentView, setCurrentView] = useState<string>('landing');
  const [activeJobId, setActiveJobId] = useState<string>(INITIAL_JOBS[0].id);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Safe SSR hydration status via useSyncExternalStore without cascading setState
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isDocSuiteOpen, setIsDocSuiteOpen] = useState<boolean>(false);
  const [docSuiteTargetJob, setDocSuiteTargetJob] = useState<RestorationJob | null>(null);

  // Hydrate client-side state from URL query params and localStorage after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedJobs = localStorage.getItem(LOCAL_STORAGE_KEY_JOBS);
        if (savedJobs) {
          const parsed = JSON.parse(savedJobs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setJobs(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load saved jobs from localStorage', e);
      }

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role');
        const viewParam = urlParams.get('view');
        const jobParam = urlParams.get('jobId');

        if (roleParam) {
          const matched = DEMO_USERS.find((u) => u.role === roleParam);
          if (matched) setCurrentUser(matched);
          if (roleParam === 'client') setCurrentView('client');
          else if (roleParam === 'sales_technician') setCurrentView('tech_pipeline');
          else if (roleParam === 'office_staff') setCurrentView('office');
          else if (roleParam === 'owner') setCurrentView('owner');
          else if (roleParam === 'superadmin') setCurrentView('superadmin');
        } else {
          const savedUser = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            if (parsed && parsed.id) setCurrentUser(parsed);
          }
        }

        if (viewParam) {
          setCurrentView(viewParam);
        }

        if (jobParam) {
          setActiveJobId(jobParam);
        }
      } catch (e) {
        console.warn('Failed to parse URL params or saved user', e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Real-time Firestore Cloud Subscription & Offline Persistence
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    testConnection()
      .then(() => {
        setIsCloudConnected(true);
        seedJobsIfEmpty(INITIAL_JOBS).catch(console.warn);
        unsubscribe = subscribeToJobs(
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

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync to localStorage only after client hydration is complete (prevent overwriting saved data with initial data on first mount)
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_JOBS, JSON.stringify(jobs));
      } catch (e) {}
    }
  }, [jobs, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(currentUser));
      } catch (e) {}
    }
  }, [currentUser, isHydrated]);

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  const handleUpdateJob = (updated: RestorationJob) => {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    // Immediate reactive write to Firestore cloud
    syncJobToFirestore(updated).catch((err) => {
      console.warn('Cloud sync error (queued locally):', err);
    });
  };

  const handleSwitchUser = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role === 'superadmin') setCurrentView('superadmin');
    else if (user.role === 'owner') setCurrentView('owner');
    else if (user.role === 'office_staff') setCurrentView('office');
    else if (user.role === 'sales_technician') setCurrentView('tech_pipeline');
    else if (user.role === 'client') setCurrentView('client');
  };

  const handleCreateNewEstimate = () => {
    const newJob: RestorationJob = {
      id: `job-${Date.now()}`,
      jobId: `DS-2026-${Math.floor(Math.random() * 800 + 200)}`,
      status: 'Draft',
      isArchived: false,
      category: 'Cat 1 (Clean)',
      finishType: 'Finished',
      cabinetryMultiplier: false,
      afterHours: false,
      client: {
        name: 'New Client Loss',
        email: 'client@example.com',
        phone: '(555) 234-9988',
        address: '100 Main Street',
        cityStateZip: 'Eugene, OR 97401',
        insuranceCarrier: 'State Farm',
        policyNumber: 'SF-PENDING',
        claimNumber: 'CLM-PENDING',
        deductible: 1000,
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
      technicianNotes: 'Emergency field intake initiated.',
      rawTranscript: '',
      signature: {
        isSigned: false,
        termsAccepted: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTechId: currentUser.id,
    };

    setJobs((prev) => [newJob, ...prev]);
    setActiveJobId(newJob.id);
    setCurrentView('tech');
    syncJobToFirestore(newJob).catch(console.warn);
  };

  const handleRestoreArchivedJob = (archived: RestorationJob) => {
    const restored: RestorationJob = {
      ...archived,
      id: `job-restored-${Date.now()}`,
      jobId: `${archived.jobId}-REV`,
      status: 'Ready for Review',
      isArchived: false,
      archivedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      technicianNotes: `Supplementary claim revision restored from archived record ${archived.jobId}.`,
    };

    setJobs((prev) => [restored, ...prev]);
    setActiveJobId(restored.id);
    setCurrentView('office');
    syncJobToFirestore(restored).catch(console.warn);
  };

  const handleOpenDocSuiteForJob = (target?: RestorationJob) => {
    setDocSuiteTargetJob(target || activeJob);
    setIsDocSuiteOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Universal Navbar with 1-Click Role Switcher */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        activeJob={activeJob}
        jobs={jobs.filter((j) => !j.isArchived)}
        onSelectJob={(j) => setActiveJobId(j.id)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenDocSuite={() => handleOpenDocSuiteForJob(activeJob)}
        currentView={currentView}
        onChangeView={setCurrentView}
        isCloudConnected={isCloudConnected}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={(view) => {
              setCurrentView(view);
              // auto align user role if navigating into role-specific dashboard
              if (view === 'tech') setCurrentUser(DEMO_USERS[3]);
              else if (view === 'tech_pipeline') setCurrentUser(DEMO_USERS[3]);
              else if (view === 'office') setCurrentUser(DEMO_USERS[2]);
              else if (view === 'office_archive') setCurrentUser(DEMO_USERS[2]);
              else if (view === 'owner') setCurrentUser(DEMO_USERS[1]);
              else if (view === 'client') setCurrentUser(DEMO_USERS[4]);
              else if (view === 'superadmin') setCurrentUser(DEMO_USERS[0]);
            }}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* 1. Sales Technician Dedicated Pipeline Dashboard */}
        {currentView === 'tech_pipeline' && (
          <TechPipelineDashboard
            jobs={jobs}
            activeJob={activeJob}
            onSelectJob={(j) => setActiveJobId(j.id)}
            onOpenScopingWorkspace={(j) => {
              if (j) setActiveJobId(j.id);
              setCurrentView('tech');
            }}
            onCreateNewEstimate={handleCreateNewEstimate}
            onNavigateToPortal={() => {
              setCurrentUser(DEMO_USERS[4]);
              setCurrentView('client');
            }}
          />
        )}

        {/* 2. Sales Technician Dedicated Job Scoping Workspace */}
        {currentView === 'tech' && (
          <TechFieldDashboard
            job={activeJob}
            onUpdateJob={handleUpdateJob}
            onNavigateToPortal={() => {
              setCurrentUser(DEMO_USERS[4]);
              setCurrentView('client');
            }}
            onNavigateToPipeline={() => setCurrentView('tech_pipeline')}
            onOpenDocSuite={() => handleOpenDocSuiteForJob(activeJob)}
          />
        )}

        {/* 3. Office Staff Active Estimating Matrix */}
        {currentView === 'office' && (
          <OfficeDashboard
            job={activeJob}
            onUpdateJob={handleUpdateJob}
            onOpenDocSuite={() => handleOpenDocSuiteForJob(activeJob)}
            onNavigateToPortal={() => {
              setCurrentUser(DEMO_USERS[4]);
              setCurrentView('client');
            }}
            onOpenArchive={() => setCurrentView('office_archive')}
          />
        )}

        {/* 4. Office Staff Dedicated Archived Estimates Vault */}
        {currentView === 'office_archive' && (
          <OfficeArchiveVault
            jobs={jobs}
            onSelectJob={(j) => {
              setActiveJobId(j.id);
            }}
            onRestoreJob={handleRestoreArchivedJob}
            onOpenDocSuite={(j) => handleOpenDocSuiteForJob(j)}
            onBackToActive={() => setCurrentView('office')}
          />
        )}

        {/* 5. Owner Executive Command Dashboard */}
        {currentView === 'owner' && (
          <OwnerDashboard
            jobs={jobs.filter((j) => !j.isArchived)}
            onSelectJob={(j) => {
              setActiveJobId(j.id);
              setCurrentView('office');
            }}
            onNavigateToOffice={() => setCurrentView('office')}
          />
        )}

        {/* 6. Superadmin Platform Directory & Console */}
        {currentView === 'superadmin' && <SuperadminDashboard />}

        {/* 7. Client Recovery Portal */}
        {currentView === 'client' && (
          <ClientPortal
            job={activeJob}
            onUpdateJob={handleUpdateJob}
            onOpenDocSuite={() => handleOpenDocSuiteForJob(activeJob)}
          />
        )}
      </main>

      {/* Universal Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSwitchUser}
      />

      {/* Official 4-Document Suite & PDF Print Modal */}
      <DocumentSuiteModal
        isOpen={isDocSuiteOpen}
        onClose={() => setIsDocSuiteOpen(false)}
        job={docSuiteTargetJob || activeJob}
      />
    </div>
  );
}
