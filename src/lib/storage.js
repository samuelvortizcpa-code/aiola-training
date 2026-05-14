import { supabase, supabaseConfigured } from './supabase';

const LOCAL_PREFIX = 'aiola-cache::';
const cacheKey = (k) => LOCAL_PREFIX + k;

function readCache(key) {
  try {
    const raw = window.localStorage.getItem(cacheKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(key, value) {
  try {
    window.localStorage.setItem(cacheKey(key), JSON.stringify(value));
  } catch {}
}

function deleteCache(key) {
  try { window.localStorage.removeItem(cacheKey(key)); } catch {}
}

export const storage = {
  async get(key) {
    const cached = readCache(key);
    if (!supabaseConfigured()) {
      return cached !== null ? { value: cached } : null;
    }
    try {
      const { data, error } = await supabase
        .from('kv_blobs')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        writeCache(key, data.value);
        return { value: data.value };
      }
      // No row in Supabase. If we have a local cache, hydrate Supabase from it.
      if (cached !== null) {
        await supabase.from('kv_blobs').upsert({
          key, value: cached, updated_at: new Date().toISOString()
        });
        return { value: cached };
      }
      return null;
    } catch (e) {
      console.warn('storage.get fell back to cache for key', key, e);
      return cached !== null ? { value: cached } : null;
    }
  },

  async set(key, value) {
    writeCache(key, value);
    if (!supabaseConfigured()) return { value };
    try {
      const { error } = await supabase
        .from('kv_blobs')
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch (e) {
      console.warn('storage.set failed (cached locally) for key', key, e);
    }
    return { value };
  },

  async delete(key) {
    deleteCache(key);
    if (!supabaseConfigured()) return { deleted: true };
    try {
      await supabase.from('kv_blobs').delete().eq('key', key);
    } catch (e) {
      console.warn('storage.delete failed for key', key, e);
    }
    return { deleted: true };
  },

  async list(prefix = '') {
    if (!supabaseConfigured()) {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(LOCAL_PREFIX + prefix)) {
          keys.push(k.replace(LOCAL_PREFIX, ''));
        }
      }
      return { keys };
    }
    try {
      const { data, error } = await supabase
        .from('kv_blobs')
        .select('key')
        .like('key', `${prefix}%`);
      if (error) throw error;
      return { keys: (data || []).map(r => r.key) };
    } catch (e) {
      console.warn('storage.list failed', e);
      return { keys: [] };
    }
  }
};

// Scorecard helpers: relational, talks directly to deliverable_scores
export const scorecards = {
  async listForTrainee(traineeUserId) {
    if (!supabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('deliverable_scores')
      .select('*')
      .eq('trainee_user_id', traineeUserId)
      .order('scored_at', { ascending: false });
    if (error) { console.warn('scorecards.listForTrainee', error); return []; }
    return data || [];
  },

  async upsert({ trainee_user_id, item_id, deliverable_id, scores, total, max_total, notes, scored_by }) {
    if (!supabaseConfigured()) return null;
    const payload = {
      trainee_user_id, item_id, deliverable_id,
      scores, total,
      max_total: max_total ?? 20,
      notes: notes || null,
      scored_by: scored_by || null,
      scored_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('deliverable_scores')
      .upsert(payload, { onConflict: 'trainee_user_id,item_id,deliverable_id' })
      .select()
      .single();
    if (error) { console.warn('scorecards.upsert', error); return null; }
    return data;
  },

  async remove(id) {
    if (!supabaseConfigured()) return false;
    const { error } = await supabase
      .from('deliverable_scores')
      .delete()
      .eq('id', id);
    return !error;
  }
};
