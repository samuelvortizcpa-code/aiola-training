/**
 * Spaced Repetition Engine
 *
 * Storage keys used:
 *   srpool:${userId}              — array of pool items (missed blocks for resurfacing)
 *   mastery:${userId}             — { [topicId]: "mastered"|"in_progress"|"weak"|"never_seen" }
 *   masteryStreaks:${userId}      — { [topicId]: { recentHits: [hitType...], lastUpdated } }
 *   weeklyReviewMeta:${userId}   — { lastReviewedAt, lastReviewedBlocks }
 */

import { storage } from './storage.js';

// ─── Storage helpers ────────────────────────────────────────────────────────

async function storageGet(key) {
  try {
    const d = await storage.get(key);
    if (d) return JSON.parse(d.value || d);
  } catch {}
  return null;
}

async function storageSet(key, value) {
  try {
    await storage.set(key, JSON.stringify(value));
  } catch {}
}

// ─── Pool Management ────────────────────────────────────────────────────────

/**
 * Add a missed block to the spaced repetition pool.
 * If blockId already exists, update missedAt.
 */
export async function addToPool(userId, poolItem) {
  const key = `srpool:${userId}`;
  const pool = (await storageGet(key)) || [];

  const existing = pool.findIndex(p => p.blockId === poolItem.blockId);
  if (existing >= 0) {
    pool[existing].missedAt = poolItem.missedAt || new Date().toISOString();
    pool[existing].confidenceAtMiss = poolItem.confidenceAtMiss;
  } else {
    pool.push({
      ...poolItem,
      missedAt: poolItem.missedAt || new Date().toISOString(),
      lastResurfacedAt: null,
    });
  }

  await storageSet(key, pool);
}

/**
 * Remove a block from the pool by blockId.
 */
export async function removeFromPool(userId, blockId) {
  const key = `srpool:${userId}`;
  const pool = (await storageGet(key)) || [];
  await storageSet(key, pool.filter(p => p.blockId !== blockId));
}

/**
 * Get up to 3 missed items whose topicTags intersect with sectionTopicTags.
 * Updates lastResurfacedAt on returned items.
 */
export async function getMissedItemsForSection(userId, sectionTopicTags) {
  if (!sectionTopicTags?.length) return [];

  const key = `srpool:${userId}`;
  const pool = (await storageGet(key)) || [];
  const tagSet = new Set(sectionTopicTags);

  const matches = pool.filter(p =>
    p.topicTags?.some(t => tagSet.has(t))
  );

  const items = matches.slice(0, 3);

  // Update lastResurfacedAt
  if (items.length > 0) {
    const now = new Date().toISOString();
    const itemIds = new Set(items.map(i => i.blockId));
    const updated = pool.map(p =>
      itemIds.has(p.blockId) ? { ...p, lastResurfacedAt: now } : p
    );
    await storageSet(key, updated);
  }

  return items.map(p => p.blockSnapshot).filter(Boolean);
}

/**
 * Get all items older than 7 days that haven't resurfaced via section overlap.
 */
export async function getWeeklyReviewItems(userId) {
  const key = `srpool:${userId}`;
  const pool = (await storageGet(key)) || [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return pool
    .filter(p => p.missedAt < sevenDaysAgo && !p.lastResurfacedAt)
    .map(p => p.blockSnapshot)
    .filter(Boolean);
}

/**
 * Get the raw pool for a user (for admin views).
 */
export async function getPool(userId) {
  return (await storageGet(`srpool:${userId}`)) || [];
}

// ─── Mastery Tracking ───────────────────────────────────────────────────────

/**
 * Mark a block as mastered. Removes from pool, updates mastery map.
 */
export async function markMastered(userId, blockId, topicTags) {
  await removeFromPool(userId, blockId);

  const mastery = (await storageGet(`mastery:${userId}`)) || {};
  for (const tag of (topicTags || [])) {
    mastery[tag] = "mastered";
  }
  await storageSet(`mastery:${userId}`, mastery);
}

/**
 * Record a topic hit and update mastery state.
 * hitType: "correct_confident" | "correct_uncertain" | "wrong_confident" | "wrong_uncertain"
 */
export async function recordTopicHit(userId, topicTags, hitType) {
  const mastery = (await storageGet(`mastery:${userId}`)) || {};
  const streaks = (await storageGet(`masteryStreaks:${userId}`)) || {};
  const now = new Date().toISOString();

  for (const tag of (topicTags || [])) {
    const current = mastery[tag] || "never_seen";

    // Initialize streak tracking
    if (!streaks[tag]) {
      streaks[tag] = { recentHits: [], lastUpdated: now };
    }
    streaks[tag].recentHits.push(hitType);
    // Keep last 10 hits
    if (streaks[tag].recentHits.length > 10) {
      streaks[tag].recentHits = streaks[tag].recentHits.slice(-10);
    }
    streaks[tag].lastUpdated = now;

    // State transitions
    switch (current) {
      case "never_seen":
        mastery[tag] = "in_progress";
        break;

      case "in_progress":
        if (hitType === "correct_confident") {
          mastery[tag] = "mastered";
        } else if (hitType === "wrong_confident") {
          mastery[tag] = "weak";
        } else if (hitType === "wrong_uncertain") {
          // Check for 2+ wrong_uncertain in a row
          const recent = streaks[tag].recentHits;
          const lastTwo = recent.slice(-2);
          if (lastTwo.length >= 2 && lastTwo.every(h => h === "wrong_uncertain")) {
            mastery[tag] = "weak";
          }
        }
        break;

      case "mastered":
        if (hitType === "wrong_confident" || hitType === "wrong_uncertain") {
          mastery[tag] = "in_progress";
        }
        break;

      case "weak":
        if (hitType === "correct_uncertain") {
          mastery[tag] = "in_progress";
        } else if (hitType === "correct_confident") {
          mastery[tag] = "mastered";
        }
        break;
    }
  }

  await storageSet(`mastery:${userId}`, mastery);
  await storageSet(`masteryStreaks:${userId}`, streaks);
}

/**
 * Get the full mastery map for a user.
 */
export async function getMasteryMap(userId) {
  return (await storageGet(`mastery:${userId}`)) || {};
}

/**
 * Get mastery streaks for admin debugging.
 */
export async function getMasteryStreaks(userId) {
  return (await storageGet(`masteryStreaks:${userId}`)) || {};
}
