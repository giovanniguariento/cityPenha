/**
 * Tipagens dos endpoints /admin/* (FRONTEND_GAMIFICATION.md §10, API.md §4).
 * Mantidos sob `shared/interface` para permitir reuso fora do módulo admin caso necessário.
 */

export type CriteriaOp = '>=' | '<=' | '>' | '<' | '==' | '!=';

export interface CriteriaLeaf {
  metric: string;
  params?: Record<string, unknown> | null;
  op: CriteriaOp;
  value: number;
}

export interface CriteriaAll {
  all: CriteriaNode[];
}

export interface CriteriaAny {
  any: CriteriaNode[];
}

export type CriteriaNode = CriteriaLeaf | CriteriaAll | CriteriaAny;

export function isCriteriaAll(n: CriteriaNode | null | undefined): n is CriteriaAll {
  return !!n && typeof n === 'object' && Array.isArray((n as CriteriaAll).all);
}

export function isCriteriaAny(n: CriteriaNode | null | undefined): n is CriteriaAny {
  return !!n && typeof n === 'object' && Array.isArray((n as CriteriaAny).any);
}

export function isCriteriaLeaf(n: CriteriaNode | null | undefined): n is CriteriaLeaf {
  return !!n && typeof n === 'object' && 'metric' in n && 'op' in n && 'value' in n;
}

/** GET /admin/metrics — descritor de cada métrica disponível na engine. */
export interface MetricInfo {
  key: string;
  description: string;
  acceptedParams: string[];
}

/** GET/POST/PATCH /admin/missions — entidade administrativa completa. */
export interface AdminMission {
  id: string;
  key: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  category: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  metricKey: string;
  metricParams: Record<string, unknown> | null;
  target: number;
  criteria: CriteriaNode | null;
  coinReward: number;
  xpReward: number;
  isReversible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AdminMissionCreate = Omit<AdminMission, 'id' | 'createdAt' | 'updatedAt'>;
export type AdminMissionPatch = Partial<AdminMissionCreate>;

/** GET/POST/PATCH /admin/badges. */
export interface AdminBadge {
  id: string;
  key: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  metricKey: string | null;
  threshold: number | null;
  criteria: CriteriaNode | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AdminBadgeCreate = Omit<AdminBadge, 'id' | 'createdAt' | 'updatedAt'>;
export type AdminBadgePatch = Partial<AdminBadgeCreate>;

/** GET/POST/PATCH /admin/levels. */
export interface AdminLevel {
  id?: string;
  levelNumber: number;
  minXp: number;
  minCompletedMissions: number;
  title: string | null;
  iconUrl: string | null;
  rewardCoins: number;
  rewardXp: number;
  createdAt?: string;
  updatedAt?: string;
}

export type AdminLevelCreate = Omit<AdminLevel, 'id' | 'createdAt' | 'updatedAt'>;
export type AdminLevelPatch = Partial<AdminLevelCreate>;

/** Linha do reward_ledger (GET /admin/users/:userId/ledger). */
export interface LedgerEntry {
  id: string;
  userId: string;
  source: string;
  reason: 'granted' | 'revoked';
  coinsDelta: number;
  xpDelta: number;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface LedgerListResponse {
  data: LedgerEntry[];
  meta: { nextCursor: string | null; count: number };
}

export interface LedgerListQuery {
  limit?: number;
  cursor?: string | null;
}

/** Resposta de POST /admin/missions/:id/preview. */
export interface PreviewResponse {
  missionId: string;
  missionKey: string;
  userId: string;
  target: number;
  primaryMetric: string;
  primaryValue: number | null;
  progress: number;
  wouldComplete: boolean;
  observedMetrics: Record<string, number>;
}

/**
 * Discriminação do `source` em uma `Reward` ou `LedgerEntry` (FRONTEND_GAMIFICATION.md §5.1).
 */
export type ParsedRewardSource =
  | { kind: 'mission'; id: string }
  | { kind: 'badge'; id: string }
  | { kind: 'levelUp'; level: number }
  | { kind: 'readXp'; wordpressPostId: number }
  | { kind: 'unknown'; raw: string };

export function parseRewardSource(source: string): ParsedRewardSource {
  if (!source) return { kind: 'unknown', raw: source };
  const idx = source.indexOf(':');
  if (idx < 0) return { kind: 'unknown', raw: source };
  const head = source.slice(0, idx);
  const tail = source.slice(idx + 1);
  switch (head) {
    case 'MISSION':
      return { kind: 'mission', id: tail };
    case 'BADGE':
      return { kind: 'badge', id: tail };
    case 'LEVEL_UP':
      return { kind: 'levelUp', level: Number(tail) };
    case 'READ_XP':
      return { kind: 'readXp', wordpressPostId: Number(tail) };
    default:
      return { kind: 'unknown', raw: source };
  }
}

export function rewardSourceLabel(source: string): string {
  const parsed = parseRewardSource(source);
  switch (parsed.kind) {
    case 'mission':
      return 'Missão';
    case 'badge':
      return 'Insígnia';
    case 'levelUp':
      return `Subiu para nível ${parsed.level}`;
    case 'readXp':
      return 'Leitura';
    default:
      return parsed.raw || '—';
  }
}
