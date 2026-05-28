import { type Timestamp } from 'firebase/firestore';

export type NoteType = 'Progress' | 'Safety' | 'Delivery' | 'Meeting' | 'Issue' | 'General' | 'RFI' | 'Submittal' | 'Punch List' | 'Daily Report';

export type ProcurementStatus = 'Not Ordered' | 'Ordered' | 'In Transit' | 'On Site';

export interface ProcurementComment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface ProcurementItem {
  id: string;
  projectId: string;
  tag: string;
  description: string;
  status: ProcurementStatus;
  vendor: string;
  leadTime: string;
  expectedDate: string; // YYYY-MM-DD
  submittalRef: string;
  division: string;
  comments: ProcurementComment[];
  deletedAt: string | null; // null if active
  ownerId: string;
  createdAt: Timestamp;
}

export interface TeamMember {
  initials: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  substantialCompletionDate?: string; // YYYY-MM-DD
  projectManager?: string;
  lastEditedBy?: string;
  ownerId: string;
  teamMembers?: TeamMember[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Note {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: NoteType;
  date: string; // YYYY-MM-DD
  photoUrls?: string[];
  backgroundColor?: string;
  authorId: string;
  createdAt: Timestamp;
  position?: number;
}

export interface Task {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  division?: string;
  subcontractor?: string;
  dueDate?: Timestamp;
  reminderAt?: Timestamp;
  completed: boolean;
  ownerId: string;
  createdAt: Timestamp;
  position?: number;
}

export interface ScheduleItem {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  division?: string;
  subcontractor?: string;
  startDate?: Timestamp;
  finishDate?: Timestamp;
  dueDate?: Timestamp; // Keep for legacy compatibility/single date view
  ownerId: string;
  createdAt: Timestamp;
  isConverted?: boolean;
  activityId?: string;
}

export interface ProjectPage {
  id: string;
  projectId: string;
  title: string;
  content: string;
  ownerId: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export interface UserProfile {
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface Submittal {
  id: string;
  projectId: string;
  specSection: string;
  description: string;
  subcontractor: string;
  status: 'Draft' | 'Pending' | 'Review' | 'Approved' | 'Rejected';
  scheduledInstallDate: string; // YYYY-MM-DD
  leadTimeWeeks: number;
  procurementFloat?: number; // Days calculated by AI or system
  trafficLightStatus?: 'green' | 'yellow' | 'red';
  followUpPriority?: 'High' | 'Medium' | 'Low';
  vendorContact?: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface Drawing {
  id: string;
  projectId: string;
  sheetNumber: string;
  sheetTitle: string;
  revisionNumber: string;
  revisionDate: string; // YYYY-MM-DD
  revisionDescription: string;
  discipline: string;
  subcontractorsAffected: string[];
  status: 'Current' | 'Superseded' | 'Void';
  ownerId: string;
  createdAt: Timestamp;
}

export interface QuantityTracker {
  id: string;
  projectId: string;
  itemName: string;
  unit: string; // e.g., 'CY', 'LF', 'SF'
  totalEstimatedQuantity: number;
  installedQuantity: number;
  status: 'On Track' | 'At Risk' | 'Completed';
  burnRateInfo?: string;
  estimatedCompletionDays?: number;
  ownerId: string;
  createdAt: Timestamp;
}

export interface DailyLog {
  id: string;
  projectId: string;
  trackerId: string;
  installDate: string; // YYYY-MM-DD
  quantity: number;
  notes: string;
  rawInput: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface SubcontractorCompliance {
  id: string;
  projectId: string;
  subcontractorName: string;
  contactEmail: string;
  coiExpirationDate: string; // YYYY-MM-DD
  contractSigned: boolean;
  safetyPlanApproved: boolean;
  mobilizationDate: string; // YYYY-MM-DD
  status: 'Compliant' | 'Non-Compliant' | 'Expiring Soon';
  ownerId: string;
  createdAt: Timestamp;
}

export interface PCO {
  id: string;
  projectId: string;
  pcoNumber: string;
  title: string;
  rawDescription: string;
  professionalDescription: string;
  category: 'Design Gap' | 'Field Condition' | 'Owner Request' | 'Other';
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Void';
  suggestedReferences: string; // RFI or Drawing refs
  estimatedCost?: number;
  subcontractor?: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface Warranty {
  id: string;
  projectId: string;
  subcontractor: string;
  scopeOfWork: string;
  startDate: string;
  endDate: string;
  isExtended: boolean;
  exclusions: string[];
  documentUrl?: string;
  status: 'Active' | 'Expired' | 'Expiring Soon';
  ownerId: string;
  createdAt: Timestamp;
}

export interface AsBuiltValidation {
  id: string;
  projectId: string;
  sheetNumber: string;
  sheetName: string;
  designImageUrl: string;
  redlineImageUrl: string;
  deviations: {
    category: string;
    description: string;
    location: string;
  }[];
  cadChecklist: string[];
  status: 'Pending' | 'Validated' | 'Revisions Required';
  ownerId: string;
  createdAt: Timestamp;
}

export interface EquipmentOM {
  id: string;
  projectId: string;
  tagId: string;
  equipmentName: string;
  manufacturer: string;
  modelNumber: string;
  maintenanceSchedule: {
    task: string;
    frequency: string;
  }[];
  spareParts: {
    name: string;
    partNumber: string;
  }[];
  rawManualText?: string;
  status: 'Draft' | 'Approved' | 'Exported';
  ownerId: string;
  createdAt: Timestamp;
}

export interface Permit {
  id: string;
  projectId: string;
  permitNumber: string;
  agency: string;
  status: 'Active' | 'Pending' | 'Closed' | 'Failed Inspection';
  lastInspectionDate?: string;
  lastInspectionResult?: string;
  correctionRequirements?: string;
  reinspectionDraftEmail?: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface SWPPPItem {
  id: string;
  projectId: string;
  bmpName: string; // e.g., 'Silt Fence', 'Inlet Protection'
  status: 'Compliant' | 'Failure' | 'In Repair';
  lastPhotoUrl?: string;
  lastAnalysis?: string;
  lastAnalysisDate?: string;
  failureDescription?: string;
  workOrderId?: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface ConstructionDailyReport {
  id: string;
  projectId: string;
  reportDate: string; // YYYY-MM-DD
  rawNotes: string;
  narrativeWorkAccomplished: string;
  narrativeDelaysIssues: string;
  suggestedActionItems: string[];
  weatherCondition?: string;
  manpowerCount?: number;
  ownerId: string;
  createdAt: Timestamp;
}

export interface PunchItem {
  id: string;
  projectId: string;
  description: string;
  location: string;
  csiDivision: string;
  responsibleSub: string;
  status: 'Open' | 'Pending' | 'Closed';
  imageUrl?: string;
  coordinates?: { x: number; y: number };
  ownerId: string;
  createdAt: Timestamp;
}

export interface PreInstallationMeeting {
  id: string;
  projectId: string;
  title: string;
  specSection: string;
  submittalRef: string;
  subcontractor: string;
  meetingDate: string; // YYYY-MM-DD
  agenda: {
    criticalConstraints: string[];
    mockupRequirements: string[];
    checklist: string[];
  };
  status: 'Scheduled' | 'Completed';
  ownerId: string;
  createdAt: Timestamp;
}

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  date: Timestamp;
  location: string;
  attendees: string;
  minutes: string;
  followUpRequired: boolean;
  parentMeetingId?: string;
  ownerId: string;
  createdAt: Timestamp;
}
