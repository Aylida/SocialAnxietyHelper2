import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import React, { useCallback, useState } from "react";
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CHARACTERS } from "../../characters";
import CharacterAvatar from "../../components/CharacterAvatar";
import { getGorevler } from "../../gorevData"; // (tabs) klasöründen 2 üst dizine çıkıyor
import { PLANT_THUMBS } from "../plantImages"; // (tabs) klasöründen 1 üst dizine çıkıyor

const GOLD_COIN = require("../../assets/images/gold_coin.png"); // (tabs) klasöründen 2 üst dizine çıkıyor
const FLAME_ICON = require("../../assets/images/flame_icon.png");
// ^ proje köküne göre yolu ayarla — assets/images/gold_coin.png'nin gerçek konumuna göre

const BROCCOLI_PHOTO = CHARACTERS.find((c) => c.id === "broccoli")?.photo;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const COLORS = {
  appBg: "#F5F5F0",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#8A8A8A",
  navBg: "#FFFFFF",
};

const GRID_COLORS = {
  worlds: { bg: "#AECBD2", fg: "#1f3a3f" },
  chat: { bg: "#B7C9A8", fg: "#33421f" },
  tracking: { bg: "#C7C2E0", fg: "#332b5c" },
  mood: { bg: "#D9A574", fg: "#5c3a17" },
};

const STAT_THEME = {
  bg: "#FFFFFF",
  border: "#EDE6D8",
  borderDeep: "#D8CCB4",
  accent: "#1A1A1A",
};

// Oyunlar ve Günün İpucu kartları artık sayfanın geri kalanıyla aynı
// açık/pastel + ince kalın-kenarlık dilinde — koyu bloklar değil.
const GAMES_THEME = {
  bg: "#FBEAD1",
  border: "#F0D2A0",
  borderDeep: "#DDAF5F",
  label: "#9C7A46",
};
const TIP_THEME = {
  bg: "#F3ECDD",
  border: "#E5D9BE",
  borderDeep: "#D0BD95",
};

const ACCENT = {
  xp: "#D9A574",
};

const DAILY_TIPS = [
  "Kaygı bir tehlike işareti değil, sadece bir alarmdır. Geçer.",
  "Küçük bir adım, hiç adım atmamaktan her zaman daha iyidir.",
  "Reddedilmek seni küçültmez; sadece bir uyumsuzluğu gösterir.",
  "Rahatsızlık hissi, büyüdüğünün kanıtıdır.",
  "Mükemmel olmana gerek yok, sadece denemen yeterli.",
  "Bugün attığın adım, yarının cesaretini inşa ediyor.",
  "Herkes bir yerden başladı — sen de başlıyorsun.",
];

const MOOD_OPTIONS = [
  { id: "great", emoji: "🌟", label: "Harika" },
  { id: "good", emoji: "🌤️", label: "İyi" },
  { id: "okay", emoji: "☁️", label: "Fena değil" },
  { id: "low", emoji: "🌧️", label: "Düşük" },
  { id: "bad", emoji: "⛈️", label: "Kötü" },
];

const DAY_LETTERS = ["P", "S", "Ç", "P", "C", "C", "P"];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calcStreak(dates: string[] | undefined): number {
  if (!dates || dates.length === 0) return 0;
  const set = new Set(dates);
  const d = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      if (i === 0) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekDays(): Date[] {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const arr: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    arr.push(d);
  }
  return arr;
}

type Habit = { name: string; colorIdx: number; dates: string[] };
type PreviewTask = { baslik: string; aciklama: string; zorluk: number } | null;

export default function HomeScreen() {
  const router = useRouter();
  const [charIdx, setCharIdx] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpMax, setXpMax] = useState(100);
  const [gorevCount, setGorevCount] = useState(0);
  const [anchors, setAnchors] = useState(0);
  const [habitStreak, setHabitStreak] = useState(0);
  const [dailyTip, setDailyTip] = useState("");

  const [moodLog, setMoodLog] = useState<Record<string, string>>({});
  const [moodPickerDate, setMoodPickerDate] = useState<string | null>(null);

  const [previewTask, setPreviewTask] = useState<PreviewTask>(null);
  const [previewWorldNum, setPreviewWorldNum] = useState(1);
  const [previewCatIdx, setPreviewCatIdx] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const keys = [
        "playerLevel",
        "playerXP",
        "playerXPMax",
        "completedGorevs",
        "trackingHabits",
        "anchors",
        "moodLog",
        "selectedCategory",
        "unlockedWorld",
      ];
      const pairs = await AsyncStorage.multiGet(keys);
      const data = Object.fromEntries(pairs) as Record<string, string | null>;
      const savedCharIdx =
        parseInt((await AsyncStorage.getItem("selectedCharacter")) ?? "0") || 0;
      setCharIdx(Math.min(savedCharIdx, CHARACTERS.length - 1));
      setLevel(parseInt(data.playerLevel ?? "1") || 1);
      setXp(parseInt(data.playerXP ?? "0") || 0);
      setXpMax(parseInt(data.playerXPMax ?? "100") || 100);
      setGorevCount(parseInt(data.completedGorevs ?? "0") || 0);
      setAnchors(parseInt(data.anchors ?? "0") || 0);

      if (data.trackingHabits) {
        const habits: Habit[] = JSON.parse(data.trackingHabits);
        const max = Math.max(0, ...habits.map((h) => calcStreak(h.dates)));
        setHabitStreak(max);
      }

      if (data.moodLog) {
        setMoodLog(JSON.parse(data.moodLog));
      }

      setDailyTip(DAILY_TIPS[getDayOfYear() % DAILY_TIPS.length]);

      const catIdx = parseInt(data.selectedCategory ?? "0") || 0;
      const unlockedWorld = parseInt(data.unlockedWorld ?? "1") || 1;
      const worldNum = catIdx === 0 ? unlockedWorld : 1;

      setPreviewCatIdx(catIdx);
      setPreviewWorldNum(worldNum);

      const doneKey = `doneGorevs_${catIdx}_${worldNum}`;
      const doneJson = await AsyncStorage.getItem(doneKey);
      const doneSet = new Set<number>(doneJson ? JSON.parse(doneJson) : []);

      const tasks = getGorevler(catIdx, worldNum);
      const nextTask = tasks.find((_: unknown, i: number) => !doneSet.has(i));
      setPreviewTask(nextTask ?? null);
    } catch (e) {
      console.warn("Home verisi yüklenemedi", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const setMoodForDate = async (date: string, moodId: string) => {
    const updated = { ...moodLog, [date]: moodId };
    setMoodLog(updated);
    await AsyncStorage.setItem("moodLog", JSON.stringify(updated));
    setMoodPickerDate(null);
  };

  const xpPercent = xpMax > 0 ? Math.min(100, (xp / xpMax) * 100) : 0;
  const weekDays = getWeekDays();
  const today = new Date();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.txtDate}>{getGreeting()}</Text>
            <Text style={styles.txtWelcome}>{"Bugün bir\nadım at"}</Text>
          </View>
          <CharacterAvatar
            charIdx={charIdx}
            size={56}
            onPress={() => router.push("/settings")}
          />
        </View>

        <View style={styles.statsRow}>
          <StatBlock value={gorevCount} label="Tamamlanan" theme={STAT_THEME} />
          <StatBlock
            value={anchors}
            label="Coin"
            theme={STAT_THEME}
            iconImage={GOLD_COIN}
          />
          <StatBlock value={level} label="Seviye" theme={STAT_THEME} />
          <StatBlock
            value={habitStreak}
            label="Seri"
            theme={STAT_THEME}
            iconImage={FLAME_ICON}
            iconSize={20}
          />
        </View>

        <View style={styles.xpBarWrap}>
          <View style={styles.xpBarBg}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${xpPercent}%`, backgroundColor: ACCENT.xp },
              ]}
            />
          </View>
          <View style={styles.xpBarLabels}>
            <Text style={styles.xpBarLeft}>
              Seviye {level} → {level + 1}
            </Text>
            <Text style={[styles.xpBarRight, { color: ACCENT.xp }]}>
              {xp} / {xpMax} XP
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>BU HAFTA NASILSIN?</Text>
        <View style={styles.moodCard}>
          {weekDays.map((day: Date, idx: number) => {
            const key = dateKey(day);
            const isToday = key === dateKey(today);
            const isFuture = day > today;
            const moodId = moodLog[key];
            const moodEmoji = MOOD_OPTIONS.find((m) => m.id === moodId)?.emoji;

            return (
              <TouchableOpacity
                key={key}
                disabled={isFuture}
                onPress={() => setMoodPickerDate(key)}
                style={styles.moodDayCol}
              >
                <Text
                  style={[
                    styles.moodDayLetter,
                    isToday && styles.moodDayLetterToday,
                  ]}
                >
                  {DAY_LETTERS[idx]}
                </Text>
                <View
                  style={[
                    styles.moodCircle,
                    isToday && styles.moodCircleToday,
                    isFuture && styles.moodCircleFuture,
                  ]}
                >
                  {moodEmoji ? (
                    <Text
                      style={{
                        fontSize: 19,
                        textShadowColor: "rgba(0,0,0,0.25)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                      }}
                    >
                      {moodEmoji}
                    </Text>
                  ) : (
                    <View style={styles.moodEmptyDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <GridCard
              title="Bölümler"
              subtitle="6 kategori"
              icon="map"
              bg={GRID_COLORS.worlds.bg}
              textColor={GRID_COLORS.worlds.fg}
              onPress={() => router.push("/worlds")}
            />
            <GridCard
              title="Rehber"
              subtitle="Sohbet et"
              icon="chatbubble"
              bg={GRID_COLORS.chat.bg}
              textColor={GRID_COLORS.chat.fg}
              onPress={() => router.push("/chat")}
            />
          </View>
          <View style={styles.gridRow}>
            <GridCard
              title="Takip"
              subtitle="Alışkanlıklar"
              icon="bar-chart"
              bg={GRID_COLORS.tracking.bg}
              textColor={GRID_COLORS.tracking.fg}
              onPress={() => router.push("/tracking")}
            />
            <GridCard
              title="Nasılsın?"
              subtitle="Kaygılıyım · İyiyim!"
              icon="happy"
              bg={GRID_COLORS.mood.bg}
              textColor={GRID_COLORS.mood.fg}
              onPress={() => router.push("/chat")}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>KALDIĞIN YERDEN DEVAM ET</Text>
        <View style={{ marginBottom: 16 }}>
          {previewTask ? (
            <TouchableOpacity
              style={styles.taskPreviewCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/level-map",
                  params: {
                    worldNumber: previewWorldNum,
                    categoryIdx: previewCatIdx,
                    worldAnchors: 5,
                  },
                })
              }
            >
              <View style={styles.taskPreviewDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taskPreviewTitle}>
                  {previewTask.baslik}
                </Text>
                <Text style={styles.taskPreviewDesc} numberOfLines={1}>
                  {previewTask.aciklama}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <Text
              style={{ paddingHorizontal: 20, color: COLORS.textSecondary }}
            >
              Bu bölümdeki tüm görevleri tamamladın 🎉
            </Text>
          )}
        </View>

        <View style={styles.gamesCard}>
          <View style={styles.gamesCardHeader}>
            <Text style={styles.gamesCardLabel}>OYUNLAR</Text>
            <View style={styles.earnCoinPill}>
              <Image source={GOLD_COIN} style={styles.earnCoinPillImg} />
              <Text style={styles.earnCoinPillText}>Coin Kazan</Text>
            </View>
          </View>
          <View style={styles.gamesIconRow}>
            <GameIconButton
              image={PLANT_THUMBS.domates}
              label="Bahçe"
              onPress={() => router.push("/garden")}
            />
            <GameIconButton
              image={BROCCOLI_PHOTO}
              label="Koşu"
              onPress={() => router.push("/runner-game")}
            />
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipLabel}>💡 GÜNÜN İPUCU</Text>
          <Text style={styles.tipText}>{dailyTip}</Text>
        </View>
      </ScrollView>

      <Modal visible={!!moodPickerDate} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMoodPickerDate(null)}
        >
          <View style={styles.moodModalBox}>
            <Text style={styles.moodModalTitle}>Bugün nasılsın?</Text>
            <View style={styles.moodOptionsRow}>
              {MOOD_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.moodOption}
                  onPress={() =>
                    moodPickerDate && setMoodForDate(moodPickerDate, m.id)
                  }
                >
                  <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                  <Text style={styles.moodOptionLabel}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

type StatTheme = {
  bg: string;
  border: string;
  borderDeep: string;
  accent: string;
};
type StatBlockProps = {
  value: number;
  label: string;
  theme: StatTheme;
  icon?: string;
  iconImage?: any;
  iconSize?: number;
};
function StatBlock({
  value,
  label,
  theme,
  icon,
  iconImage,
  iconSize = 20,
}: StatBlockProps) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          borderBottomColor: theme.borderDeep,
        },
      ]}
    >
      <View style={styles.statIconSlot}>
        {iconImage ? (
          <Image
            source={iconImage}
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          icon && <Text style={{ fontSize: iconSize }}>{icon}</Text>
        )}
      </View>
      <Text style={[styles.statValue, { color: theme.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type GridCardProps = {
  title: string;
  subtitle: string;
  icon: IoniconName;
  bg: string;
  textColor: string;
  onPress: () => void;
};
function GridCard({
  title,
  subtitle,
  icon,
  bg,
  textColor,
  onPress,
}: GridCardProps) {
  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={26}
        color={textColor}
        style={{ marginBottom: 12 }}
      />
      <Text style={[styles.gridCardTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.gridCardSub, { color: textColor, opacity: 0.75 }]}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

type GameIconButtonProps = {
  image: any;
  label: string;
  onPress: () => void;
};
function GameIconButton({ image, label, onPress }: GameIconButtonProps) {
  return (
    <TouchableOpacity
      style={styles.gameIconWrap}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.gameIconCircle}>
        <View style={styles.gameIconImageClip}>
          <Image
            source={image}
            style={styles.gameIconImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.gameIconBadge}>
          <Image source={GOLD_COIN} style={styles.gameIconBadgeCoin} />
        </View>
      </View>
      <Text style={styles.gameIconLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.appBg },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  txtDate: { fontSize: 12, color: COLORS.textSecondary },
  txtWelcome: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 4,
    lineHeight: 36,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  statIconSlot: {
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 20, fontWeight: "bold" },
  statLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  xpBarWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
    marginBottom: 6,
  },
  xpBarFill: { height: "100%" },
  xpBarLabels: { flexDirection: "row", justifyContent: "space-between" },
  xpBarLeft: { fontSize: 10, color: COLORS.textSecondary },
  xpBarRight: { fontSize: 10, fontWeight: "bold" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
  },

  moodCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  moodDayCol: { alignItems: "center", flex: 1 },
  moodDayLetter: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: "bold",
  },
  moodDayLetterToday: { color: COLORS.textPrimary },
  moodCircle: {
    width: 36,
    height: 36,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  moodCircleToday: { borderWidth: 1, borderColor: "#babab970" },
  moodCircleFuture: { opacity: 0.4 },
  moodEmptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D8D3C8",
  },

  gamesCard: {
    backgroundColor: GAMES_THEME.bg,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: GAMES_THEME.border,
    borderBottomWidth: 4,
    borderBottomColor: GAMES_THEME.borderDeep,
  },
  gamesCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  gamesCardLabel: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    color: GAMES_THEME.label,
  },
  earnCoinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderWidth: 1.5,
    borderColor: GAMES_THEME.border,
    borderBottomWidth: 3,
    borderBottomColor: GAMES_THEME.borderDeep,
  },
  earnCoinPillImg: { width: 14, height: 14 },
  earnCoinPillText: {
    fontSize: 10,
    fontWeight: "bold",
    color: GAMES_THEME.label,
  },
  gamesIconRow: { flexDirection: "row", gap: 22 },
  gameIconWrap: { alignItems: "center" },
  gameIconCircle: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gameIconImageClip: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: GAMES_THEME.border,
  },
  gameIconImage: { width: "100%", height: "100%" },
  gameIconBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: GAMES_THEME.bg,
  },
  gameIconBadgeCoin: { width: 16, height: 16 },
  gameIconLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 8,
  },

  grid: { paddingHorizontal: 16, marginBottom: 12 },
  gridRow: { flexDirection: "row", marginBottom: 10 },
  gridCard: {
    flex: 1,
    height: 120,
    borderRadius: 28,
    padding: 18,
    marginRight: 10,
    justifyContent: "flex-end",
  },
  gridCardTitle: { fontSize: 15, fontWeight: "bold" },
  gridCardSub: { fontSize: 11, marginTop: 3 },

  taskPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
  },
  taskPreviewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#b1a396",
    marginRight: 14,
  },
  taskPreviewTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  taskPreviewDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  tipCard: {
    backgroundColor: TIP_THEME.bg,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: TIP_THEME.border,
    borderBottomWidth: 4,
    borderBottomColor: TIP_THEME.borderDeep,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 6,
    lineHeight: 19,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  moodModalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
  },
  moodModalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  moodOptionsRow: { flexDirection: "row", justifyContent: "space-between" },
  moodOption: { alignItems: "center", flex: 1 },
  moodOptionLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});
