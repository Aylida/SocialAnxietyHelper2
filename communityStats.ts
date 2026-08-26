import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebaseConfig'; // dosyanı nereye koyduğuna göre yol değişebilir

// ── Hafta anahtarı (örn. "2026-W34") ──
function getWeekKey(): string {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${week}`;
}

// Türkçe karakterleri Firestore döküman ID'sinde sorun çıkarmasın diye sadeleştir
function slug(text: string): string {
  return text
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Bu duyguyu bu hafta işaretleyenlerin sayısını +1 artırır.
 * Tamamen anonim — hangi kullanıcının işaretlediği tutulmaz, sadece toplam sayı.
 */
export async function incrementFeelingCount(feeling: string): Promise<void> {
  const id = `${getWeekKey()}_${slug(feeling)}`;
  const ref = doc(db, 'moodStats', id);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1) });
    } else {
      await setDoc(ref, { count: 1 });
    }
  } catch (e) {
    console.warn('Community stat güncellenemedi', e);
  }
}

/** Bu duyguyu bu hafta kaç kişinin işaretlediğini döner (sadece okuma). */
export async function getFeelingCount(feeling: string): Promise<number> {
  const id = `${getWeekKey()}_${slug(feeling)}`;
  const ref = doc(db, 'moodStats', id);
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data().count as number) : 0;
  } catch (e) {
    console.warn('Community stat okunamadı', e);
    return 0;
  }
}
