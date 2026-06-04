import { shouldShowReadReward, readRewardPoints } from './read-reward';
import { ReadPostResult } from '../interface/home.interface';

describe('shouldShowReadReward', () => {
  it('returns false when post was already viewed', () => {
    expect(shouldShowReadReward({}, 1, true)).toBe(false);
  });

  it('returns false when alreadyRead is true', () => {
    expect(shouldShowReadReward({ alreadyRead: true }, 1)).toBe(false);
  });

  it('returns false when already is true (legacy)', () => {
    expect(shouldShowReadReward({ already: true }, 1)).toBe(false);
  });

  it('returns false when rewards is empty', () => {
    expect(shouldShowReadReward({ rewards: [] }, 42)).toBe(false);
  });

  it('returns true when rewards has granted READ_XP for this post', () => {
    const res: ReadPostResult = {
      rewards: [{ source: 'READ_XP:42', reason: 'granted', coinsDelta: 0, xpDelta: 10 }],
    };
    expect(shouldShowReadReward(res, 42)).toBe(true);
  });

  it('returns false when READ_XP grant is for another post', () => {
    const res: ReadPostResult = {
      rewards: [{ source: 'READ_XP:99', reason: 'granted', coinsDelta: 0, xpDelta: 10 }],
    };
    expect(shouldShowReadReward(res, 42)).toBe(false);
  });

  it('returns true when no duplicate signals (legacy shape)', () => {
    expect(shouldShowReadReward({ missions: [] }, 1)).toBe(true);
  });
});

describe('readRewardPoints', () => {
  it('uses xpDelta from READ_XP reward', () => {
    const res: ReadPostResult = {
      rewards: [{ source: 'READ_XP:1', reason: 'granted', coinsDelta: 0, xpDelta: 15 }],
    };
    expect(readRewardPoints(res, 1)).toBe(15);
  });

  it('defaults to 10 without rewards', () => {
    expect(readRewardPoints({})).toBe(10);
  });
});
