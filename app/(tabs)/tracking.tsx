import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const GOLD_COIN = require("../../assets/images/gold_coin.png"); // (tabs) klasöründen 2 üst dizine çıkıyor
const FLAME_ICON = require("../../assets/images/flame_icon.png");
const STAR_ICON = require("../../assets/images/star_icon.png");

const PREFS_KEY_HABITS = "trackingHabits";

const MONTH_NAMES = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
const DAY_NAMES = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const HABIT_COLORS = [
  "#E8633A",
  "#3BAD7A",
  "#8B6FD4",
  "#5B9DBF",
  "#D4A843",
  "#D45B8A",
];
const HABIT_BG_COLORS = [
  "#FDF0EB",
  "#EBF8F2",
  "#F0ECFB",
  "#E8F2F8",
  "#FBF5E6",
  "#FBECF4",
];

const COLORS = {
  appBg: "#F5F5F0",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#B0A898",
  bgEmpty: "#E8E3DC",
  accent: "#C8420A",
  pastelGreen: "#E6F4EA",
};

const MINI_STAT_THEME = {
  bg: "#FFFFFF",
  border: "#EDE6D8",
  borderDeep: "#D8CCB4",
  accent: "#1A1A1A",
};

// ── Tipler ─────────────────────────────────────────────────────────
type Habit = {
  name: string;
  colorIdx: number;
  dates: string[];
};

// ── Tarih yardımcıları ────────────────────────────────────────────────
function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}
function getWeekStart(offset: number): Date {
  const now = new Date();
  const dow = now.getDay(); // 0=Pazar
  const diff = dow === 0 ? -6 : 1 - dow;
  const d = new Date(now);
  d.setDate(now.getDate() + diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function calcStreak(doneDates: string[]): number {
  if (!doneDates || doneDates.length === 0) return 0;
  const set = new Set(doneDates);
  const d = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = dateKey(d);
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

export default function TrackingScreen() {
  const [tab, setTab] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [monthHabitIdx, setMonthHabitIdx] = useState(0);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitColor, setNewHabitColor] = useState(0);
  const [editingHabit, setEditingHabit] = useState<number | null>(null);
  const [coins, setCoins] = useState(0);

  const loadHabits = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(PREFS_KEY_HABITS);
      if (!json) {
        setHabits([
          { name: "Günlük yazma", colorIdx: 0, dates: [] },
          { name: "Spor", colorIdx: 1, dates: [] },
          { name: "Sesli kitap okuma", colorIdx: 2, dates: [] },
        ]);
      } else {
        setHabits(JSON.parse(json));
      }
    } catch (e) {
      console.warn("Alışkanlıklar yüklenemedi", e);
    }
  }, []);

  const loadCoins = useCallback(async () => {
    const c = parseInt((await AsyncStorage.getItem("Coins")) ?? "0") || 0;
    setCoins(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
      loadCoins();
    }, [loadHabits, loadCoins]),
  );

  const saveHabits = async (updated: Habit[]) => {
    setHabits(updated);
    await AsyncStorage.setItem(PREFS_KEY_HABITS, JSON.stringify(updated));
  };

  const toggleDone = (habitIdx: number, day: Date) => {
    const key = dateKey(day);
    const updated = habits.map((h, i) => {
      if (i !== habitIdx) return h;
      const has = h.dates.includes(key);
      const dates = has ? h.dates.filter((d) => d !== key) : [...h.dates, key];
      return { ...h, dates };
    });
    saveHabits(updated);
  };

  const maxStreak = useMemo(
    () => Math.max(0, ...habits.map((h) => calcStreak(h.dates))),
    [habits],
  );

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekDays = useMemo(() => {
    const arr: Date[] = [];
    const d = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      arr.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()} · ${weekStart.getDate()} – ${end.getDate()}`;
  }, [weekStart]);

  // today, kararlı bir referans olsun diye useMemo içinde — her render'da yeniden hesaplanmasın
  const today = useMemo(() => new Date(), []);

  // Haftalık başarı yüzdesi
  const weekRate = useMemo(() => {
    let done = 0;
    let possible = 0;
    weekDays.forEach((day) => {
      if (day <= today) {
        habits.forEach((h) => {
          possible++;
          if (h.dates.includes(dateKey(day))) done++;
        });
      }
    });
    return possible === 0 ? 0 : Math.round((done * 100) / possible);
  }, [weekDays, habits, today]);

  const weekDoneCount = useMemo(() => {
    let done = 0;
    weekDays.forEach((day) => {
      if (day <= today) {
        habits.forEach((h) => {
          if (h.dates.includes(dateKey(day))) done++;
        });
      }
    });
    return done;
  }, [weekDays, habits, today]);

  const openAddModal = () => {
    setNewHabitName("");
    setNewHabitColor(0);
    setEditingHabit(null);
    setAddModalVisible(true);
  };

  const openEditModal = (habit: Habit, idx: number) => {
    setNewHabitName(habit.name);
    setNewHabitColor(habit.colorIdx);
    setEditingHabit(idx);
    setAddModalVisible(true);
  };

  const submitHabitModal = () => {
    const name = newHabitName.trim();
    if (!name) return;
    if (editingHabit === null) {
      saveHabits([...habits, { name, colorIdx: newHabitColor, dates: [] }]);
    } else {
      const updated = habits.map((h, i) =>
        i === editingHabit ? { ...h, name, colorIdx: newHabitColor } : h,
      );
      saveHabits(updated);
    }
    setAddModalVisible(false);
  };

  const deleteHabit = (idx: number) => {
    Alert.alert("Alışkanlığı Sil", `'${habits[idx].name}' silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          saveHabits(habits.filter((_, i) => i !== idx));
          setAddModalVisible(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Takip</Text>
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeText}>{maxStreak}</Text>
          <Image source={FLAME_ICON} style={styles.streakBadgeImg} />
        </View>
      </View>

      {/* TAB BAR */}
      <View style={styles.tabBar}>
        <TabButton
          label="Haftalık"
          active={tab === "weekly"}
          onPress={() => setTab("weekly")}
        />
        <TabButton
          label="Aylık"
          active={tab === "monthly"}
          onPress={() => setTab("monthly")}
        />
        <TabButton
          label="Yıllık"
          active={tab === "yearly"}
          onPress={() => setTab("yearly")}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === "weekly" && (
          <View>
            {/* Hafta navigasyonu */}
            <View style={styles.weekNav}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => setWeekOffset((o) => o - 1)}
              >
                <Text style={styles.circleBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.weekLabel}>{weekLabel}</Text>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => setWeekOffset((o) => o + 1)}
              >
                <Text style={styles.circleBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Gün isimleri */}
            <View style={styles.weekDayRow}>
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today);
                return (
                  <View key={i} style={styles.weekDayCol}>
                    <Text
                      style={[styles.weekDayName, isToday && styles.accentText]}
                    >
                      {DAY_NAMES[i]}
                    </Text>
                    <Text
                      style={[styles.weekDayNum, isToday && styles.accentText]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Büyük stat kartı — yüzde + halka */}
            <View style={styles.bigCard}>
              <View style={styles.bigCardTop}>
                <View>
                  <Text style={styles.bigPercent}>{weekRate}%</Text>
                  <Text style={styles.bigPercentLabel}>HAFTALIK BAŞARI</Text>
                </View>
                <ProgressRing percent={weekRate} />
              </View>
            </View>

            {/* Mini statlar */}
            <View style={styles.statsRow}>
              <MiniStat
                iconImage={FLAME_ICON}
                value={maxStreak}
                label="SERİ"
                iconSize={22}
                theme={MINI_STAT_THEME}
              />
              <MiniStat
                iconImage={GOLD_COIN}
                value={coins}
                label="COIN"
                iconSize={22}
                theme={MINI_STAT_THEME}
              />
              <MiniStat
                iconImage={STAR_ICON}
                value={weekDoneCount}
                label="GÖREV"
                iconSize={26}
                theme={MINI_STAT_THEME}
              />
            </View>

            {/* Alışkanlıklar */}
            <Text style={styles.sectionTitle}>Alışkanlıklar</Text>
            {habits.map((h, idx) => (
              <HabitRow
                key={idx}
                habit={h}
                weekDays={weekDays}
                today={today}
                onToggle={(day: Date) => toggleDone(idx, day)}
                onEdit={() => openEditModal(h, idx)}
              />
            ))}

            <TouchableOpacity style={styles.addHabitBtn} onPress={openAddModal}>
              <Text style={styles.addHabitText}>+ Kendin ekle</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === "monthly" && (
          <MonthlyView
            habits={habits}
            month={viewMonth}
            year={viewYear}
            habitIdx={monthHabitIdx}
            onPrevMonth={() => {
              if (viewMonth === 0) {
                setViewMonth(11);
                setViewYear((y) => y - 1);
              } else {
                setViewMonth((m) => m - 1);
              }
            }}
            onNextMonth={() => {
              if (viewMonth === 11) {
                setViewMonth(0);
                setViewYear((y) => y + 1);
              } else {
                setViewMonth((m) => m + 1);
              }
            }}
            onSelectHabit={setMonthHabitIdx}
          />
        )}

        {tab === "yearly" && (
          <YearlyView
            habits={habits}
            year={viewYear}
            onPrevYear={() => setViewYear((y) => y - 1)}
            onNextYear={() => setViewYear((y) => y + 1)}
          />
        )}
      </ScrollView>

      {/* Ekle / Düzenle modalı */}
      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingHabit === null ? "Alışkanlık Ekle" : "Düzenle"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Alışkanlık adı..."
              value={newHabitName}
              onChangeText={setNewHabitName}
            />
            <Text style={styles.colorLabel}>Renk seç:</Text>
            <View style={styles.colorRow}>
              {HABIT_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setNewHabitColor(i)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    newHabitColor === i && styles.colorDotSelected,
                  ]}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              {editingHabit !== null && (
                <TouchableOpacity onPress={() => deleteHabit(editingHabit)}>
                  <Text style={styles.deleteText}>Sil</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={{ marginRight: 16 }}
              >
                <Text style={styles.cancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitHabitModal}>
                <Text style={styles.confirmText}>
                  {editingHabit === null ? "Ekle" : "Güncelle"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Alt bileşenler ─────────────────────────────────────────────────
type TabButtonProps = { label: string; active: boolean; onPress: () => void };
function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type ProgressRingProps = { percent: number; size?: number };
function ProgressRing({ percent, size = 68 }: ProgressRingProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * percent) / 100;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={COLORS.bgEmpty}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={COLORS.textPrimary}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

type MiniStatTheme = {
  bg: string;
  border: string;
  borderDeep: string;
  accent: string;
};
type MiniStatProps = {
  icon?: string;
  iconImage?: any;
  iconSize?: number;
  value: number;
  label: string;
  theme: MiniStatTheme;
};
function MiniStat({
  icon,
  iconImage,
  iconSize = 22,
  value,
  label,
  theme,
}: MiniStatProps) {
  return (
    <View
      style={[
        styles.miniStat,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          borderBottomColor: theme.borderDeep,
        },
      ]}
    >
      <View style={styles.miniStatIconSlot}>
        {iconImage ? (
          <Image
            source={iconImage}
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        )}
      </View>
      <Text style={[styles.miniStatValue, { color: theme.accent }]}>
        {value}
      </Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

type HabitRowProps = {
  habit: Habit;
  weekDays: Date[];
  today: Date;
  onToggle: (day: Date) => void;
  onEdit: () => void;
};
function HabitRow({ habit, weekDays, today, onToggle, onEdit }: HabitRowProps) {
  const color = HABIT_COLORS[habit.colorIdx % HABIT_COLORS.length];
  const bgColor = HABIT_BG_COLORS[habit.colorIdx % HABIT_BG_COLORS.length];
  const streak = calcStreak(habit.dates);

  return (
    <TouchableOpacity
      style={styles.habitCard}
      onLongPress={onEdit}
      activeOpacity={0.8}
    >
      <Text style={styles.habitName} numberOfLines={2}>
        {habit.name}
      </Text>
      <View style={styles.habitDots}>
        {weekDays.map((day, i) => {
          const isFuture = day > today;
          const isDone = !isFuture && habit.dates.includes(dateKey(day));
          const isToday = isSameDay(day, today);
          return (
            <TouchableOpacity
              key={i}
              disabled={isFuture}
              onPress={() => onToggle(day)}
              style={[
                styles.habitDot,
                { backgroundColor: isDone ? color : COLORS.bgEmpty },
                isToday && !isDone && styles.habitDotToday,
              ]}
            />
          );
        })}
      </View>
      <View
        style={[
          styles.streakPill,
          { backgroundColor: streak > 0 ? bgColor : COLORS.bgEmpty },
        ]}
      >
        {streak > 0 ? (
          <View style={styles.streakPillRow}>
            <Image source={FLAME_ICON} style={styles.streakPillImg} />
            <Text style={{ fontSize: 10, fontWeight: "bold", color }}>
              {streak}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 10,
              fontWeight: "bold",
              color: COLORS.textSecondary,
            }}
          >
            —
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onEdit} style={{ paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 18, color: COLORS.textSecondary }}>⋮</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

type MonthlyViewProps = {
  habits: Habit[];
  month: number;
  year: number;
  habitIdx: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectHabit: (idx: number) => void;
};
function MonthlyView({
  habits,
  month,
  year,
  habitIdx,
  onPrevMonth,
  onNextMonth,
  onSelectHabit,
}: MonthlyViewProps) {
  const today = new Date();
  const days = MONTH_DAYS[month] + (month === 1 && year % 4 === 0 ? 1 : 0);
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const habit = habits[habitIdx] || habits[0];
  if (!habit) return null;
  const color = HABIT_COLORS[habit.colorIdx % HABIT_COLORS.length];

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const doneCount = habit.dates.filter((d) => d.startsWith(monthPrefix)).length;
  const rate = Math.round((doneCount * 100) / days);
  const streak = calcStreak(habit.dates);

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <View>
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.circleBtn} onPress={onPrevMonth}>
          <Text style={styles.circleBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity style={styles.circleBtn} onPress={onNextMonth}>
          <Text style={styles.circleBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bigCard}>
        <View style={styles.monthTabsRow}>
          {habits.map((h, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onSelectHabit(i)}
              style={[
                styles.monthTab,
                {
                  backgroundColor:
                    i === habitIdx
                      ? HABIT_COLORS[h.colorIdx % HABIT_COLORS.length]
                      : COLORS.bgEmpty,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "bold",
                  color: i === habitIdx ? "#fff" : COLORS.textSecondary,
                }}
              >
                {h.name.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.monthDayHeaders}>
          {DAY_NAMES.map((dn, i) => (
            <Text key={i} style={styles.monthDayHeaderText}>
              {dn}
            </Text>
          ))}
        </View>

        <View style={styles.monthGrid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.monthCell} />;
            const cellDate = new Date(year, month, d);
            const isFuture = cellDate > today;
            const isDone = !isFuture && habit.dates.includes(dateKey(cellDate));
            const isToday = isSameDay(cellDate, today);
            return (
              <View
                key={i}
                style={[
                  styles.monthCell,
                  { backgroundColor: isDone ? color : COLORS.bgEmpty },
                  isToday && {
                    borderWidth: 2,
                    borderColor: COLORS.textPrimary,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "bold",
                    color: isDone ? "#fff" : COLORS.textSecondary,
                  }}
                >
                  {isDone ? "✓" : d}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.statsRowInline}>
          <StatCol value={doneCount} label="Tamamlandı" />
          <StatCol value={`${rate}%`} label="Başarı" />
          <StatCol value={streak} label="Güncel seri" />
        </View>
      </View>
    </View>
  );
}

type YearlyViewProps = {
  habits: Habit[];
  year: number;
  onPrevYear: () => void;
  onNextYear: () => void;
};
function YearlyView({ habits, year, onPrevYear, onNextYear }: YearlyViewProps) {
  const today = new Date();
  const totalDone = habits.reduce(
    (sum: number, h: Habit) => sum + h.dates.length,
    0,
  );
  const maxStreak = Math.max(
    0,
    ...habits.map((h: Habit) => calcStreak(h.dates)),
  );

  return (
    <View>
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.circleBtn} onPress={onPrevYear}>
          <Text style={styles.circleBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{year}</Text>
        <TouchableOpacity style={styles.circleBtn} onPress={onNextYear}>
          <Text style={styles.circleBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bigCard}>
        <View style={styles.yearGrid}>
          {MONTH_NAMES.map((mn, m) => {
            const days = MONTH_DAYS[m] + (m === 1 && year % 4 === 0 ? 1 : 0);
            const isCur =
              m === today.getMonth() && year === today.getFullYear();
            const monthPrefix = `${year}-${String(m + 1).padStart(2, "0")}`;
            let totalForMonth = 0;
            habits.forEach((h: Habit) => {
              totalForMonth += h.dates.filter((d: string) =>
                d.startsWith(monthPrefix),
              ).length;
            });
            const avgLevel = Math.min(
              3,
              Math.round(
                (totalForMonth / Math.max(1, days * habits.length)) * 4,
              ),
            );
            const levelColors = ["#E2DDD6", "#E8C8A8", "#C8956C", "#A0522D"];
            return (
              <View key={m} style={styles.yearMonthBlock}>
                <Text
                  style={[styles.yearMonthLabel, isCur && styles.accentText]}
                >
                  {mn.slice(0, 3)}
                </Text>
                <View
                  style={{
                    height: 36,
                    backgroundColor: levelColors[avgLevel],
                    borderRadius: 6,
                  }}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.statsRowInline}>
          <StatCol value={totalDone} label="Toplam gün" />
          <StatCol value={maxStreak} label="En uzun seri" />
          <StatCol value={habits.length} label="Alışkanlık" />
        </View>
      </View>
    </View>
  );
}

type StatColProps = { value: number | string; label: string };
function StatCol({ value, label }: StatColProps) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{ fontSize: 17, fontWeight: "bold", color: COLORS.textPrimary }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{label}</Text>
    </View>
  );
}

// ── Stiller ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.appBg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: { fontSize: 30, fontWeight: "bold", color: COLORS.textPrimary },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4CAF50",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  streakBadgeImg: { width: 20, height: 20 },
  streakBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#EEEAE2",
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: COLORS.cardBg },
  tabBtnText: { fontSize: 12, fontWeight: "bold", color: COLORS.textSecondary },
  tabBtnTextActive: { color: COLORS.textPrimary },

  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEEAE2",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnText: { fontSize: 18, color: COLORS.textSecondary },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },

  weekDayRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 6 },
  weekDayCol: { flex: 1, alignItems: "center" },
  weekDayName: { fontSize: 10, color: COLORS.textSecondary },
  weekDayNum: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  accentText: { color: COLORS.accent, fontWeight: "bold" },

  bigCard: {
    backgroundColor: COLORS.pastelGreen,
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 20,
  },
  bigCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bigPercent: { fontSize: 48, fontWeight: "bold", color: COLORS.textPrimary },
  bigPercentLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  miniStat: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  miniStatIconSlot: {
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  miniStatLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginLeft: 20,
    marginBottom: 10,
  },

  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  habitName: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    width: 80,
  },
  habitDots: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
  habitDot: { width: 18, height: 18, borderRadius: 4, marginLeft: 3 },
  habitDotToday: { borderWidth: 2, borderColor: COLORS.accent },
  streakPill: {
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  streakPillRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  streakPillImg: { width: 16, height: 16 },

  addHabitBtn: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.textSecondary,
    borderRadius: 14,
    marginHorizontal: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  addHabitText: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },

  monthTabsRow: { flexDirection: "row", marginBottom: 14, gap: 4 },
  monthTab: {
    flex: 1,
    borderRadius: 50,
    paddingVertical: 5,
    alignItems: "center",
  },
  monthDayHeaders: { flexDirection: "row", marginBottom: 6 },
  monthDayHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statsRowInline: {
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EAE0CE",
  },

  yearGrid: { flexDirection: "row", flexWrap: "wrap" },
  yearMonthBlock: { width: "33.33%", padding: 4 },
  yearMonthLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginBottom: 3,
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: COLORS.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  colorLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 14,
    marginBottom: 8,
  },
  colorRow: { flexDirection: "row", gap: 10 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: "#1A1A1A" },
  modalActions: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  deleteText: { color: "red", fontWeight: "bold" },
  cancelText: { color: COLORS.textSecondary, fontWeight: "bold" },
  confirmText: { color: COLORS.accent, fontWeight: "bold" },
});
