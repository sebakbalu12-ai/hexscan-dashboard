/** Shared API types (mirrors server/src/lib/*). */

export interface User {
  id: number;
  email: string;
  username: string;
  role: 'user' | 'admin';
  avatarColor: string;
  createdAt: number;
  lastLoginAt: number | null;
}

export interface LicenseStatus {
  plan: string;
  planLabel: string;
  active: boolean;
  unlimited: boolean;
  lifetime?: boolean;
  expiresAt: number | null;
  activatedAt: number | null;
  daysRemaining: number | null;
  millisecondsRemaining: number | null;
  key: string | null;
  dailyPins: number | null;
}

export interface LicenseHistoryEntry {
  key: string;
  plan: string;
  status: string;
  activatedAt: number | null;
  expiresAt: number | null;
  lifetime: boolean;
}

export interface Plan {
  id: string;
  label: string;
  tagline: string;
  price: number;
  currency: string;
  durationDays: number | null;
  popular?: boolean;
  features: string[];
}

export type PinStatus = 'pending' | 'running' | 'finished' | 'expired';
export type Verdict = 'clean' | 'suspicious' | 'cheating' | null;

export interface Pin {
  id: number;
  code: string;
  name: string | null;
  player: string;
  game: string;
  instance: string | null;
  visibility: 'private' | 'public';
  status: PinStatus;
  verdict: Verdict;
  riskScore: number | null;
  riskHistory: number | null;
  durationMs: number | null;
  notes: string | null;
  createdAt: number;
  expiresAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  detectionsCount: number;
  ownerUsername: string | null;
  downloadUrl: string;
}

export interface Detection {
  id: number;
  title: string;
  detail: string | null;
  severity: 'boot' | 'warning' | 'instance' | 'critical';
  category: string | null;
  createdAt: number;
}

export interface PcInfo {
  bootTime: string | null;
  vpn: string | null;
  recycleTime: string | null;
  os: string | null;
  installDate: string | null;
  game: string | null;
  windowText: string | null;
  cpu: string | null;
  gpu: string | null;
  ram: string | null;
  disk: string | null;
}

export interface Share {
  id: number;
  email: string;
  access: 'view' | 'full';
  createdAt: number;
}

export interface PinDetail extends Pin {
  detections: Detection[];
  detectionBreakdown: { total: number; byCategory: Record<string, number> };
  pcInfo: PcInfo | null;
  shares: Share[];
  timeline: { label: string; at: number }[];
}

export interface PinListResponse {
  items: Pin[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  games: string[];
  statuses: PinStatus[];
}

export interface Stats {
  daily: { used: number; quota: number | null; unlimited: boolean; resetsAt: number };
  total: number;
  thisMonth: number;
  lastMonth: number;
  growth: number;
  pending: number;
  finished: number;
  expired: number;
  cheating: number;
  finishedThisWeek: number;
  completionRate: number;
}

export interface OverviewResponse {
  license: LicenseStatus;
  stats: Stats;
  recent: Pin[];
  detections: { total: number; inline: number; warnings: number; boot: number };
  verdicts: { cheating: number; suspicious: number; clean: number };
}

export interface DetectionsResponse {
  severity: string;
  counts: Record<string, number>;
  items: (Detection & { pin: { code: string; player: string; game: string; verdict: Verdict; riskScore: number | null } })[];
}
