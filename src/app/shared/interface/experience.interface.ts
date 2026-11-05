export interface ExperienceMeta {
  venue: string;
  address?: string;
  dateLabel: string;
  timeLabel: string;
  conditionLabel?: string;
}

export interface ExperienceListItem {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  xpReward: number;
  featured?: boolean;
  isAd?: boolean;
  meta: ExperienceMeta;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  startsAt?: string;
  endsAt?: string | null;
}

export interface ExperienceDetail extends ExperienceListItem {
  description: string;
  tags: string[];
  liked?: boolean;
  shared?: boolean;
}

export type ExperienceStatus = 'draft' | 'published' | 'archived';

export interface ExperienceMine extends ExperienceDetail {
  status: ExperienceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceLikePayload {
  liked: boolean;
  likeCount: number;
  missions?: unknown[];
  badges?: unknown[];
  level?: unknown | null;
  user?: { id: string; xp: number; coins: number };
  completedMissionsCount?: number;
  rewards?: { source: string; reason: string; coinsDelta: number; xpDelta: number }[];
}

export interface ExperienceSharePayload {
  shared: boolean;
  shareCount: number;
  alreadyShared: boolean;
  missions?: unknown[];
  badges?: unknown[];
  level?: unknown | null;
  user?: { id: string; xp: number; coins: number };
  completedMissionsCount?: number;
  rewards?: { source: string; reason: string; coinsDelta: number; xpDelta: number }[];
}

export interface CreateExperienceFields {
  title: string;
  description: string;
  venue: string;
  address?: string;
  startsAt: string;
  endsAt?: string | null;
  conditionLabel?: string;
  tags?: string[];
  xpReward?: number;
  featured?: boolean;
  isAd?: boolean;
  status?: ExperienceStatus;
  coverUrl?: string;
}
