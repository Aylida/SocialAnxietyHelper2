import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * CoinManager — Çapa ve seri yönetimi
 *
 * Kazanma kuralları:
 *   • Her 5 günlük seri tamamlanınca → +1 ⚓
 *   • Bölüm tamamlanınca             → +bölümün elmas değeri
 *
 * XP arka planda çalışmaya devam eder (seviye için), UI'da gösterilmez.
 *
 * Java'daki CoinManager.java ile birebir aynı mantık — anahtar isimleri
 * de bilerek aynı tutuldu ki eski verilerle (varsa) uyumlu kalsın.
 */

// ── AsyncStorage anahtarları ─────────────────────────────────────
export const KEY_COINS = "coins";
export const KEY_STREAK = "currentSeri";
export const KEY_STREAK_LAST_DAY = "streakLastDay"; // epoch gün sayısı
export const KEY_STREAK_COINS = "streakCoinCount"; // kaç kez 5'in katına ulaşıldı

export const KEY_XP = "playerXP";
export const KEY_XP_MAX = "playerXPMax";
export const KEY_LEVEL = "playerLevel";

export const KEY_TASKS_DONE = "completedGorevs";

const XP_MAX_DEFAULT = 1000;
const MAX_LEVEL = 10;
const STREAK_DIAMOND_STEP = 5; // her 5 seride 1 elmas
const AVATAR_PRICE = 5;
const CATEGORY_PRICE = 3;

export type CoinResult = {
  coinsEarned: number; // bu görevden kazanılan elmas (0 veya 1)
  newStreak: number; // güncel seri
  milestoneReached: boolean; // 5'in katına ulaşıldı mı
};

// ── Yardımcılar ───────────────────────────────────────────────────
async function getInt(key: string, fallback: number): Promise<number> {
  const v = await AsyncStorage.getItem(key);
  if (v === null) return fallback;
  const n = parseInt(v);
  return isNaN(n) ? fallback : n;
}

async function setInt(key: string, value: number): Promise<void> {
  await AsyncStorage.setItem(key, String(value));
}

function todayEpochDay(): number {
  return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
}

// ── Elmas işlemleri ───────────────────────────────────────────────

/** Mevcut elmas bakiyesini döner */
export async function getCoins(): Promise<number> {
  return getInt(KEY_COINS, 0);
}

/** Elmas ekle ve kaydet */
export async function addCoins(amount: number): Promise<void> {
  const current = await getCoins();
  await setInt(KEY_COINS, current + amount);
}

/**
 * Elmas harca. Yeterli bakiye varsa harcar ve true döner.
 * Yeterli bakiye yoksa false döner, harcama yapılmaz.
 */
export async function spendCoins(amount: number): Promise<boolean> {
  const current = await getCoins();
  if (current < amount) return false;
  await setInt(KEY_COINS, current - amount);
  return true;
}

/** Avatar satın alma — 5 ⚓ */
export async function buyAvatar(): Promise<boolean> {
  return spendCoins(AVATAR_PRICE);
}

/** Kategori açma — 3 ⚓ */
export async function buyCategory(): Promise<boolean> {
  return spendCoins(CATEGORY_PRICE);
}

// ── Bölüm tamamlama ───────────────────────────────────────────────

/**
 * Bir bölüm tamamlandığında çağrılır.
 * @param coinReward bölümün tanımlı elmas ödülü
 * @returns kazanılan elmas sayısı
 */
export async function onWorldCompleted(coinReward: number): Promise<number> {
  await addCoins(coinReward);
  return coinReward;
}

// ── Seri (streak) yönetimi ──────────────────────────────────────────

/**
 * Günlük görev tamamlandığında çağrılır.
 * Seriyi günceller, 5'in katına ulaşıldıysa elmas verir.
 */
export async function onTaskCompleted(): Promise<CoinResult> {
  const todayEpoch = todayEpochDay();
  const lastDay = await getInt(KEY_STREAK_LAST_DAY, -1);
  let streak = await getInt(KEY_STREAK, 0);
  const streakCoinCount = await getInt(KEY_STREAK_COINS, 0);

  // Bugün zaten sayıldıysa tekrar sayma
  if (lastDay === todayEpoch) {
    const tasksDone = await getInt(KEY_TASKS_DONE, 0);
    await setInt(KEY_TASKS_DONE, tasksDone + 1);
    return { coinsEarned: 0, newStreak: streak, milestoneReached: false };
  }

  // Dün yapıldıysa seriyi devam ettir, yoksa sıfırla
  if (lastDay === todayEpoch - 1) {
    streak++;
  } else {
    streak = 1;
  }

  await setInt(KEY_STREAK, streak);
  await setInt(KEY_STREAK_LAST_DAY, todayEpoch);

  // Her 5 seride 1 elmas
  const newStreakCoinCount = Math.floor(streak / STREAK_DIAMOND_STEP);
  let coinsEarned = 0;
  let milestoneReached = false;

  if (newStreakCoinCount > streakCoinCount) {
    coinsEarned = newStreakCoinCount - streakCoinCount;
    await setInt(KEY_STREAK_COINS, newStreakCoinCount);
    await addCoins(coinsEarned);
    milestoneReached = true;
  }

  const tasksDone = await getInt(KEY_TASKS_DONE, 0);
  await setInt(KEY_TASKS_DONE, tasksDone + 1);

  return { coinsEarned, newStreak: streak, milestoneReached };
}

// ── XP / Seviye (arka planda) ────────────────────────────────────────

/**
 * XP ekle ve gerekirse seviye atla.
 * UI'da gösterilmez, sadece arka planda çalışır.
 */
export async function addXP(xpGained: number): Promise<void> {
  let xp = await getInt(KEY_XP, 0);
  let level = await getInt(KEY_LEVEL, 1);
  let xpMax = await getInt(KEY_XP_MAX, XP_MAX_DEFAULT);

  let newXP = xp + xpGained;
  if (newXP >= xpMax && level < MAX_LEVEL) {
    newXP -= xpMax;
    level++;
    xpMax = Math.round(xpMax * 1.3);
    await setInt(KEY_LEVEL, level);
    await setInt(KEY_XP_MAX, xpMax);
  }
  await setInt(KEY_XP, Math.min(newXP, xpMax));
}

/** Mevcut seviyeyi döner */
export async function getLevel(): Promise<number> {
  return getInt(KEY_LEVEL, 1);
}

/** Mevcut seriyi döner */
export async function getStreak(): Promise<number> {
  return getInt(KEY_STREAK, 0);
}
