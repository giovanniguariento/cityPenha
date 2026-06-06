import { SafeHtml } from '@angular/platform-browser';

/** HTTP 200 body shape from cityPenha-back (`{ data, meta? }`). */
export interface ApiSuccessEnvelope<T> {
  data: T;
  meta?: unknown;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details: unknown;
}

// Define a estrutura do autor do post
export interface Author {
  name: string;
  avatarUrl: string;
}

// Define a estrutura principal do post
export interface Post {
  slug: string;
  id: number;
  title: string;
  /** Feed: `"post"` | `"anuncio"` (API §2.1). */
  type?: 'post' | 'anuncio';
  author: Author;
  /** Feed: tag IDs; detalhe: nomes das tags (strings). */
  tags: number[] | string[];
  readingTime: number;
  image: string;
  categories: number[]; // Array de IDs das categorias
  categoryName: string;
  /** URL-safe slug da categoria principal (ex: "seguranca"). Usado na rota /noticias/:categorySlug/:slug. */
  categorySlug: string;
  /**
   * GET /post/:slug com Bearer opcional: estado de curtida e contagem.
   */
  liked?: boolean;
  likesCount?: number;
  onlyVideo?: boolean;
  viewed?: boolean;
  /** Texto relativo de publicação (ex.: GET /discovery — FeedItem). */
  publishedAtRelative?: string;
}

// Interface raiz que representa o conteúdo de `data` em GET /home
export interface BlogResponse {
  categories: Category[];
  carousel: Post[];
}

// Post detail interface (for single post page)
export interface PostDetail extends Post {
  content: string | SafeHtml;
  img?: string;
  resume?: string;
  date?: string;
  onlyVideo?: boolean;
  /** Pastas do usuário que contêm o post (logado cadastrado). */
  savedFolderIds?: string[];
}

/** Payload útil de POST /post/:wordpressPostId/like (após unwrap de `data`). */
export interface PostLikePayload {
  liked: boolean;
  likesCount: number;
  missions?: MissionApiItem[];
  level?: UserLevel | null;
  user?: BackendUser;
  completedMissionsCount?: number;
}

/** Recompensa aplicada num endpoint de write (FRONTEND_GAMIFICATION.md §5). */
export interface Reward {
  source: string;
  reason: 'granted' | 'revoked';
  coinsDelta: number;
  xpDelta: number;
}

/** POST /user/read/:postId — unwrap `data` (idempotente). */
export interface ReadPostResult {
  /** Backend: leitura já registrada, sem novo XP. */
  alreadyRead?: boolean;
  /** Legado; preferir `alreadyRead`. */
  already?: boolean;
  user?: BackendUser;
  completedMissionsCount?: number;
  daysWithReads?: string[];
  missions?: MissionApiItem[];
  level?: UserLevel | null;
  rewards?: Reward[];
}

// Define a estrutura da categoria, que contém uma lista de posts
export interface Category {
  id: number;
  name: string;
  posts: Post[];
}

// Category card interface (for favorites)
export interface CategoryCard {
  id: string;
  title: string;
  count: number;
  image: string;
}

/** Item of GET /user/me/folders */
export interface UserFolder {
  id: string;
  userId: string;
  name: string;
  internalKey: string | null;
  createdAt: string;
  coverImageUrl: string | null;
  lastWordpressPostId: number | null;
  itemCount: number;
}

/** Item of GET /user/me/folders/:folderId/posts */
export interface FolderPostCategory {
  id: number;
  name: string;
}

/** Nested post payload; may be WordPress REST shape or normalized fields. */
export interface FolderPostItem {
  wordpressPostId: number;
  post: Record<string, unknown>;
  categories: FolderPostCategory[];
  /** URL da imagem do card (prioridade sobre campos dentro de `post`). */
  image?: string;
}

export interface FolderPostsData {
  folderId: string;
  posts: FolderPostItem[];
}

/** Resposta de POST/DELETE em pasta — pastas sistema podem incluir gamificação (API §2.5). */
export interface FolderPostMutationPayload {
  folderId: string;
  wordpressPostId: number;
  missions?: MissionApiItem[];
  level?: UserLevel | null;
  user?: BackendUser;
  completedMissionsCount?: number;
}

// User interface (UI perfil) — bio alinhada a `User.about` da API (GET/PATCH /user/me).
export interface User {
  name: string;
  about: string;
  level: number;
  avatarUrl: string;
}

// User stats interface
export interface UserStat {
  value: string;
  label: string;
  icon: string;
  color: string;
}

// Signup request — API exige campos truthy; o serviço aplica fallbacks.
export interface SignupRequest {
  email: string;
  firebaseUid: string;
  name: string;
  photoUrl: string;
}

// Backend user representation
export interface BackendUser {
  id: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  nickname?: string | null;
  about?: string | null;
  firebaseUid?: string | null;
  wordpressId?: number | null;
  xp?: number | null;
  coins?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Body de PATCH /user/me (pelo menos um campo na requisição real). */
export interface UpdateMeRequest {
  name?: string;
  nickname?: string | null;
  about?: string | null;
}

export interface UserLevelAxisProgress {
  current: number;
  required: number;
  remaining: number;
  /** 0-1: fraction relative to the jump from current level floor to next level requirement. */
  fraction: number;
}

export interface UserLevelProgressToNextLevel {
  nextLevelNumber: number;
  minXp: number;
  minCompletedMissions: number;
  xp: UserLevelAxisProgress;
  missions: UserLevelAxisProgress;
}

export interface UserLevel {
  levelNumber: number;
  minXp: number;
  minCompletedMissions: number;
  /** Presente apenas em GET /user/me; `null` quando não há próximo nível. */
  progressToNextLevel?: UserLevelProgressToNextLevel | null;
}

export interface UserLevelProgressSnapshot {
  percentage: number;
  currentLevel: number;
  nextLevel: number | null;
  xp: {
    current: number;
    requiredForNext: number | null;
  };
  missions: {
    current: number;
    requiredForNext: number | null;
  };
}

/** Badge item returned by GET /user/me and GET /user/me/badges */
export interface BadgeApiItem {
  id: string;
  key: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  metricKey: string | null;
  threshold: number | null;
  earned: boolean;
  earnedAt: string | null;
  progress: number | null;
}

/** Conteúdo de `data` em GET /user/me (após unwrap). */
export interface UserMePayload {
  user: BackendUser;
  completedMissionsCount: number;
  daysWithReads: string[];
  missions: MissionApiItem[];
  badges: BadgeApiItem[];
  level: UserLevel | null;
  levelProgress: UserLevelProgressSnapshot | null;
}

/** Conteúdo de `data` em GET /user/me/frequency (após unwrap). */
export interface FrequencyData {
  daysWithReads: string[];
  today: string;
}

/** Item em `topics` de GET /discovery (§3.3). */
export interface DiscoveryTopic {
  id: number;
  name: string;
  slug: string;
  newsCount: number;
  /** URL da imagem do post mais recente deste tópico (opcional). */
  latestPostImageUrl?: string | null;
}

/** Item em `popularAuthors` de GET /discovery. */
export interface DiscoveryPopularAuthor {
  wordpressUserId: number;
  name: string;
  avatarUrl: string | null;
  totalLikes: number;
}

/** Conteúdo de `data` em GET /discovery. */
export interface DiscoveryResponse {
  newExperiences: unknown[];
  editorsChoice: unknown[];
  topics: DiscoveryTopic[];
  worldNews: Post[];
  trendingTopics: Post[];
  popularAuthors: DiscoveryPopularAuthor[];
}

/** Autor de um comentário (nickname tem prioridade sobre name). */
export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** Item de comentário retornado pela API. */
export interface CommentView {
  id: string;
  content: string;
  author: CommentAuthor;
  createdAt: string;
  createdAtRelative: string;
  likeCount: number;
  replyCount?: number;
  liked?: boolean;
  isOwn?: boolean;
}

/** Envelope de listagem de comentários (data + meta). */
export interface CommentsListPayload {
  data: CommentView[];
  meta: { nextCursor: string | null };
}

/** Resposta de POST /post/:id/comments (após unwrap de `data`). */
export interface CreateCommentPayload {
  comment: CommentView;
  missions?: MissionApiItem[];
  badges?: unknown[];
  level?: unknown | null;
  user?: { id: string; xp: number; coins: number };
  completedMissionsCount?: number;
  rewards?: Reward[];
}

/** Resposta de POST /comment/:id/like (após unwrap de `data`). */
export interface CommentLikePayload {
  liked: boolean;
  likeCount: number;
}

/** Mission item returned by GET /mission */
export interface MissionApiItem {
  id: string;
  key: string;
  title: string;
  description: string | null;
  target: number;
  coinReward: number;
  xpReward: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
}
