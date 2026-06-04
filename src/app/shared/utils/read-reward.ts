import { parseRewardSource } from '../interface/admin.interface';
import { ReadPostResult } from '../interface/home.interface';

function hasGrantedReadXp(rewards: ReadPostResult['rewards'], postId?: number): boolean {
  if (!rewards?.length) {
    return false;
  }
  return rewards.some((r) => {
    if (r.reason !== 'granted') {
      return false;
    }
    const parsed = parseRewardSource(r.source);
    if (parsed.kind !== 'readXp') {
      return false;
    }
    if (postId != null && Number.isFinite(postId) && parsed.wordpressPostId !== postId) {
      return false;
    }
    return true;
  });
}

/** XP concedido por READ_XP nesta resposta; padrão 10 quando não vier em `rewards`. */
export function readRewardPoints(res: ReadPostResult | null | undefined, postId?: number): number {
  if (!res?.rewards?.length) {
    return 10;
  }
  const grant = res.rewards.find((r) => {
    if (r.reason !== 'granted') {
      return false;
    }
    const parsed = parseRewardSource(r.source);
    if (parsed.kind !== 'readXp') {
      return false;
    }
    if (postId != null && Number.isFinite(postId) && parsed.wordpressPostId !== postId) {
      return false;
    }
    return true;
  });
  const xp = grant?.xpDelta;
  return xp != null && xp > 0 ? xp : 10;
}

/**
 * Indica se o toast de pontos por leitura deve ser exibido.
 * Alinha com `alreadyRead`, `rewards` vazio / sem READ_XP e `post.viewed`.
 */
export function shouldShowReadReward(
  res: ReadPostResult | null | undefined,
  postId?: number,
  postViewed?: boolean
): boolean {
  if (postViewed === true) {
    return false;
  }
  if (!res) {
    return false;
  }
  if (res.alreadyRead === true || res.already === true) {
    return false;
  }
  if (Array.isArray(res.rewards)) {
    return hasGrantedReadXp(res.rewards, postId);
  }
  return true;
}
