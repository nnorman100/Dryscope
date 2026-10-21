import { UserRole } from './types';

// Roles that belong to the restoration company. Anyone else who signs in is a
// client and only sees jobs whose client email matches their verified email.
// Keep in sync with isStaff() in firestore.rules.
export const STAFF_ROLES: UserRole[] = ['superadmin', 'owner', 'office_staff', 'sales_technician'];

export function isStaffRole(role: string | null | undefined): role is UserRole {
  return !!role && (STAFF_ROLES as string[]).includes(role);
}

// Views each role may open. Staff can open the client portal so a tech can hand
// the device to the homeowner to sign on site.
const VIEWS_BY_ROLE: Record<UserRole, string[]> = {
  superadmin: ['landing', 'superadmin', 'owner', 'office', 'office_archive', 'tech_pipeline', 'tech', 'client'],
  owner: ['landing', 'owner', 'office', 'office_archive', 'tech_pipeline', 'tech', 'client'],
  office_staff: ['landing', 'office', 'office_archive', 'tech_pipeline', 'tech', 'client'],
  sales_technician: ['landing', 'tech_pipeline', 'tech', 'client'],
  client: ['landing', 'client'],
};

export function canOpenView(role: UserRole, view: string): boolean {
  return VIEWS_BY_ROLE[role].includes(view);
}

export function homeViewForRole(role: UserRole): string {
  switch (role) {
    case 'superadmin':
      return 'superadmin';
    case 'owner':
      return 'owner';
    case 'office_staff':
      return 'office';
    case 'sales_technician':
      return 'tech_pipeline';
    case 'client':
      return 'client';
  }
}
