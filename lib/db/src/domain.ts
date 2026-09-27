export type UserRole = "CUSTOMER" | "PROVIDER" | "CORPORATE";

export type ProviderApprovalStatus =
  | "NOT_APPLIED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  roles: UserRole[];
  activeRole: UserRole;
  providerApprovalStatus: ProviderApprovalStatus;
  isVerifiedProvider: boolean;
  providerCategories?: string[];
  profilePhotoUrl?: string;
}

export type JobRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "COMPLETED"
  | "CANCELLED";

export interface JobRequest {
  id: string;
  customerId: string;
  categoryId: string;
  title: string;
  description: string;
  status: JobRequestStatus;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  assignedProvider?: {
    id: string;
    name: string;
    phone: string;
    etaMinutes?: number;
  };
}

export const USER_ROLES = ["CUSTOMER", "PROVIDER", "CORPORATE"] as const;
export const JOB_REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "ON_THE_WAY",
  "COMPLETED",
  "CANCELLED",
] as const;