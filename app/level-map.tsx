import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import * as CoinManager from "../coinManager";
import { getGorevler } from "../gorevData";

const GOLD_COIN = require("../assets/images/gold_coin.png"); // level-map.tsx app/ içinde, bir üst dizin
const FLAME_ICON = require("../assets/images/flame_icon.png");

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 120;
const DISMISS_X = SCREEN_WIDTH * 1.5;

const WORLD_COLORS = [
  "#C8420A",
  "#8B1A4A",
  "#1B4332",
  "#1A3A5C",
  "#4A1A6B",
  "#2C4A1A",
  "#5A0A2A",
  "#1A1A1A",
];

const CLOSING_LINES = [
  "Küçük adımlar büyük değişimler yaratır. 🌱",
  "Bunu denemen bile başlı başına cesaret. 💪",
  "Sonuç ne olursa olsun, denedin — bu yeterli. ✨",
  "Rahatsız hissetmek büyüdüğünün kanıtıdır. 🌿",
  "Kendine biraz nazik ol, iyi gidiyorsun. 💛",
  "Her tekrar, seni biraz daha güçlendiriyor. 🌟",
];

function getRepeatCount(aciklama: string): number {
  const text = aciklama.toLowerCase();
  if (/(iki|2)\s*(kez|kere|gün|farklı)/.test(text)) return 2;
  if (/(üç|3)\s*(kez|kere|gün|farklı)/.test(text)) return 3;
  if (/(beş|5)\s*(kez|kere|gün|farklı)/.test(text)) return 5;
  return 1;
}

type Gorev = {
  baslik: string;
  aciklama: string;
  zorluk: number;
  kilitli: boolean;
};

function toStr(v: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(v)) return v[0] ?? fallback;
  return v ?? fallback;
}

export default function LevelMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const worldNumber = parseInt(toStr(params.worldNumber, "1")) || 1;
  const categoryIdx = parseInt(toStr(params.categoryIdx, "0")) || 0;
  const worldCoins = parseInt(toStr(params.worldCoins, "5")) || 5;
  const worldTopic = toStr(params.worldTopic, "");

  const [tasks, setTasks] = useState<Gorev[]>([]);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());
  const [skippedSet, setSkippedSet] = useState<Set<number>>(new Set());
  const [repeatProgress, setRepeatProgress] = useState<Record<number, number>>(
    {},
  );
  const [curIndex, setCurIndex] = useState(0);
  const [browseMode, setBrowseMode] = useState(false);

  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerXP, setPlayerXP] = useState(0);
  const [playerXPMax, setPlayerXPMax] = useState(1000);
  const [streak, setStreak] = useState(0);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationCoins, setCelebrationCoins] = useState(0);

  const pan = useRef(new Animated.ValueXY()).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const hintRightOpacity = useRef(new Animated.Value(0)).current;
  const hintLeftOpacity = useRef(new Animated.Value(0)).current;
  const animatingRef = useRef(false);

  const color =
    WORLD_COLORS[Math.min(worldNumber - 1, WORLD_COLORS.length - 1)];

  const doneKey = `doneGorevs_${categoryIdx}_${worldNumber}`;
  const countKey = `completedGorevs_${categoryIdx}_${worldNumber}`;
  const claimKey = `Coin_claimed_${categoryIdx}_${worldNumber}`;
  const repeatKey = `repeatProgress_${categoryIdx}_${worldNumber}`;

  const firstUndoneIndex = (done: Set<number>, list: Gorev[]): number => {
    for (let i = 0; i < list.length; i++) if (!done.has(i)) return i;
    return 0;
  };
  const nextUndoneIndex = (
    done: Set<number>,
    list: Gorev[],
    from: number,
  ): number => {
    for (let i = from; i < list.length; i++) if (!done.has(i)) return i;
    return -1;
  };

  const loadEverything = useCallback(async () => {
    const gorevler = getGorevler(categoryIdx, worldNumber) as Gorev[];
    setTasks(gorevler);

    const level = await CoinManager.getLevel();
    const streakVal = await CoinManager.getStreak();
    const xp =
      parseInt((await AsyncStorage.getItem(CoinManager.KEY_XP)) ?? "0") || 0;
    const xpMax =
      parseInt(
        (await AsyncStorage.getItem(CoinManager.KEY_XP_MAX)) ?? "1000",
      ) || 1000;

    setPlayerLevel(level);
    setStreak(streakVal);
    setPlayerXP(xp);
    setPlayerXPMax(xpMax);

    const doneJson = await AsyncStorage.getItem(doneKey);
    let done = new Set<number>();
    if (doneJson) {
      try {
        done = new Set(JSON.parse(doneJson));
      } catch {}
    }
    setDoneSet(done);

    const repJson = await AsyncStorage.getItem(repeatKey);
    if (repJson) {
      try {
        setRepeatProgress(JSON.parse(repJson));
      } catch {}
    }

    const isBrowse = gorevler.length > 0 && done.size >= gorevler.length;
    setBrowseMode(isBrowse);
    setCurIndex(isBrowse ? 0 : firstUndoneIndex(done, gorevler));
  }, [categoryIdx, worldNumber, doneKey, repeatKey]);

  useEffect(() => {
    loadEverything();
  }, [loadEverything]);

  const saveDoneSet = async (newDoneSet: Set<number>) => {
    await AsyncStorage.setItem(doneKey, JSON.stringify(Array.from(newDoneSet)));
    await AsyncStorage.setItem(countKey, String(newDoneSet.size));
  };

  const unlockNextWorld = async () => {
    if (categoryIdx !== 0) return;
    const current =
      parseInt((await AsyncStorage.getItem("unlockedWorld")) ?? "1") || 1;
    if (worldNumber >= current && worldNumber < 8) {
      await AsyncStorage.setItem("unlockedWorld", String(worldNumber + 1));
    }
  };

  const resetCardPosition = () => {
    pan.setValue({ x: 0, y: 0 });
    cardOpacity.setValue(1);
    hintRightOpacity.setValue(0);
    hintLeftOpacity.setValue(0);
  };

  const animateNextCardIn = () => {
    pan.setValue({ x: 400, y: 30 });
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      animatingRef.current = false;
    });
    hintRightOpacity.setValue(0);
    hintLeftOpacity.setValue(0);
  };

  const swipeDismiss = (complete: boolean) => {
    if (animatingRef.current || tasks.length === 0) return;
    animatingRef.current = true;
    const targetX = complete ? DISMISS_X : -DISMISS_X;

    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: targetX, y: -30 },
        duration: 350,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (complete) handleSwipeRight();
      else handleSwipeLeft();
    });
  };

  const snapBack = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 6,
    }).start();
    Animated.timing(hintRightOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    Animated.timing(hintLeftOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    if (animatingRef.current) return;
    const { translationX, translationY } = event.nativeEvent;
    pan.setValue({ x: translationX, y: translationY * 0.25 });
    const progress = Math.min(Math.abs(translationX) / SWIPE_THRESHOLD, 1);
    hintRightOpacity.setValue(translationX > 0 ? progress : 0);
    hintLeftOpacity.setValue(translationX < 0 ? progress : 0);
  };

  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      if (animatingRef.current) return;
      const { translationX, velocityX } = event.nativeEvent;
      if (
        translationX > SWIPE_THRESHOLD ||
        (translationX > 50 && velocityX > 600)
      ) {
        swipeDismiss(true);
      } else if (
        translationX < -SWIPE_THRESHOLD ||
        (translationX < -50 && velocityX < -600)
      ) {
        swipeDismiss(false);
      } else {
        snapBack();
      }
    }
  };

  const handleSwipeRight = () => {
    if (browseMode) {
      const next = (curIndex + 1) % tasks.length;
      setCurIndex(next);
      resetCardPosition();
      animateNextCardIn();
      return;
    }
    completeCurrentTask();
  };

  const handleSwipeLeft = () => {
    if (browseMode) {
      const next = (curIndex - 1 + tasks.length) % tasks.length;
      setCurIndex(next);
      resetCardPosition();
      animateNextCardIn();
      return;
    }
    skipCurrentTask();
  };

  const completeCurrentTask = async () => {
    const wasAlreadyDone = doneSet.has(curIndex);
    let newDoneSet = doneSet;

    if (!wasAlreadyDone) {
      const task = tasks[curIndex];
      const repeatCount = getRepeatCount(task.aciklama);
      const currentProgress = (repeatProgress[curIndex] || 0) + 1;

      const updatedProgress = {
        ...repeatProgress,
        [curIndex]: currentProgress,
      };
      setRepeatProgress(updatedProgress);
      await AsyncStorage.setItem(repeatKey, JSON.stringify(updatedProgress));

      setSkippedSet((prev) => {
        if (!prev.has(curIndex)) return prev;
        const updated = new Set(prev);
        updated.delete(curIndex);
        return updated;
      });

      await CoinManager.addXP(task.zorluk * 10);
      const result = await CoinManager.onTaskCompleted();
      setStreak(result.newStreak);
      const newLevel = await CoinManager.getLevel();
      setPlayerLevel(newLevel);
      const newXP =
        parseInt((await AsyncStorage.getItem(CoinManager.KEY_XP)) ?? "0") || 0;
      const newXPMax =
        parseInt(
          (await AsyncStorage.getItem(CoinManager.KEY_XP_MAX)) ?? "1000",
        ) || 1000;
      setPlayerXP(newXP);
      setPlayerXPMax(newXPMax);

      if (result.milestoneReached) {
        Alert.alert(
          "🎉",
          `+${result.coinsEarned} coin  |  ${result.newStreak} günlük seri!`,
        );
      }

      if (currentProgress >= repeatCount) {
        newDoneSet = new Set(doneSet);
        newDoneSet.add(curIndex);
        setDoneSet(newDoneSet);
        await saveDoneSet(newDoneSet);

        if (newDoneSet.size >= tasks.length) {
          animatingRef.current = false;
          await onAllDone();
          return;
        }
      } else if (!result.milestoneReached) {
        Alert.alert(
          "💪",
          `${currentProgress}/${repeatCount} tamamlandı. Devam!`,
        );
      }
    }

    let next = nextUndoneIndex(newDoneSet, tasks, curIndex + 1);
    if (next === -1) next = firstUndoneIndex(newDoneSet, tasks);
    setCurIndex(next);
    resetCardPosition();
    animateNextCardIn();
  };

  const skipCurrentTask = () => {
    if (!doneSet.has(curIndex)) {
      setSkippedSet((prev) => new Set(prev).add(curIndex));
    }
    let next = nextUndoneIndex(doneSet, tasks, curIndex + 1);
    if (next === -1) next = firstUndoneIndex(doneSet, tasks);
    setCurIndex(next);
    resetCardPosition();
    animateNextCardIn();
  };

  const jumpToTask = (index: number) => {
    if (animatingRef.current || index === curIndex) return;
    if (doneSet.has(index) && !browseMode) return;
    setCurIndex(index);
    resetCardPosition();
    animateNextCardIn();
  };

  const goToPreviousCard = () => {
    if (animatingRef.current || tasks.length === 0) return;
    const prev = curIndex > 0 ? curIndex - 1 : tasks.length - 1;
    setCurIndex(prev);
    resetCardPosition();
    animateNextCardIn();
  };

  const onAllDone = async () => {
    const claimed = (await AsyncStorage.getItem(claimKey)) === "true";
    if (claimed) {
      setBrowseMode(true);
      setCurIndex(0);
      resetCardPosition();
      animateNextCardIn();
      return;
    }

    await CoinManager.onWorldCompleted(worldCoins);
    await AsyncStorage.setItem(claimKey, "true");
    await unlockNextWorld();

    setCelebrationCoins(worldCoins);
    setShowCelebration(true);
  };

  if (tasks.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Görev bulunamadı</Text>
          <Text style={styles.emptyDesc}>Bu bölüm henüz hazır değil.</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 20 }}
          >
            <Text style={{ color: color, fontWeight: "bold" }}>← Geri dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const task = tasks[curIndex];
  const xpPercent =
    playerXPMax > 0 ? Math.min(100, (playerXP / playerXPMax) * 100) : 0;
  const closingLine = CLOSING_LINES[curIndex % CLOSING_LINES.length];
  const repeatCount = getRepeatCount(task.aciklama);
  const repeatDone = repeatProgress[curIndex] || 0;

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.avatarPlaceholder} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName} numberOfLines={1}>
              Kahraman
            </Text>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>Sv. {playerLevel}</Text>
            </View>
            <View style={styles.streakPill}>
              <Image source={FLAME_ICON} style={styles.streakPillImg} />
              <Text style={styles.streakPillText}>{streak}</Text>
            </View>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
          </View>
          <Text style={styles.xpText}>
            {playerXP} / {playerXPMax} XP
          </Text>
        </View>
        <View style={styles.counterPill}>
          <Text style={styles.counterText} numberOfLines={1}>
            {doneSet.size}/{tasks.length}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          BÖLÜM {worldNumber}
          {worldTopic ? ` — ${worldTopic.toUpperCase()}` : ""}
        </Text>
        <Text style={styles.sectionTitle}>Görevler</Text>
      </View>

      <View style={styles.pipRow}>
        {tasks.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => jumpToTask(i)}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            style={styles.pipTouchArea}
          >
            <View
              style={[
                styles.pip,
                i === curIndex && styles.pipActive,
                doneSet.has(i) && styles.pipDone,
                skippedSet.has(i) && !doneSet.has(i) && styles.pipSkipped,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.cardStack}>
        <View
          style={[styles.bgCard, { transform: [{ scale: 0.92 }], top: 14 }]}
        />
        <View
          style={[styles.bgCard, { transform: [{ scale: 0.96 }], top: 7 }]}
        />

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: color,
                opacity: cardOpacity,
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { rotate },
                ],
              },
            ]}
          >
            <Animated.View
              style={[styles.hintBadgeRight, { opacity: hintRightOpacity }]}
            >
              <Text style={styles.hintTextRight}>TAMAM ✓</Text>
            </Animated.View>
            <Animated.View
              style={[styles.hintBadgeLeft, { opacity: hintLeftOpacity }]}
            >
              <Text style={styles.hintTextLeft}>ATLA →</Text>
            </Animated.View>

            {repeatCount > 1 && (
              <View style={styles.repeatBadge}>
                <Text style={styles.repeatBadgeText}>
                  {repeatDone}/{repeatCount}
                </Text>
              </View>
            )}

            <View style={styles.cardTopRow}>
              <Text style={styles.taskNo}>
                {curIndex + 1} / {tasks.length}
              </Text>
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyText}>
                  {task.zorluk === 1
                    ? "★☆☆"
                    : task.zorluk === 2
                      ? "★★☆"
                      : "★★★"}
                </Text>
              </View>
            </View>

            <Text style={styles.taskTitle}>{task.baslik}</Text>
            <Text style={styles.taskDesc}>{task.aciklama}</Text>

            <View style={{ flex: 1 }} />

            <Text style={styles.closingLine}>{closingLine}</Text>

            <Text style={styles.swipeHint}>sağa kaydır →</Text>
          </Animated.View>
        </PanGestureHandler>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.btnSkip}
          onPress={() => swipeDismiss(false)}
        >
          <Ionicons name="close" size={24} color="#FF4F4F" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnDone}
          onPress={() => swipeDismiss(true)}
        >
          <Ionicons name="checkmark" size={30} color="#F9E04B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnBack} onPress={goToPreviousCard}>
          <Ionicons name="arrow-undo" size={22} color="#999" />
        </TouchableOpacity>
      </View>

      {showCelebration && (
        <View style={styles.celebrationOverlay}>
          <ConfettiBurst />
          <View style={styles.celebrationCard}>
            <Text style={{ fontSize: 44 }}>🎉</Text>
            <Text style={styles.celebrationTitle}>TEBRİKLER!</Text>
            <Text style={styles.celebrationText}>
              Tüm görevleri tamamladın!
            </Text>
            <View style={styles.celebrationCoinRow}>
              <Image source={GOLD_COIN} style={styles.celebrationCoinImg} />
              <Text style={styles.celebrationCoinText}>
                +{celebrationCoins} coin kazandın!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.celebrationBtnPrimary}
              onPress={() => {
                setShowCelebration(false);
                router.replace("/worlds");
              }}
            >
              <Text style={styles.celebrationBtnPrimaryText}>Haritaya Dön</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.celebrationBtnGhost}
              onPress={() => {
                setShowCelebration(false);
                setBrowseMode(true);
                setCurIndex(0);
                resetCardPosition();
              }}
            >
              <Text style={styles.celebrationBtnGhostText}>Görevlere Bak</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Konfeti (dış paket kullanmadan, kendi basit animasyonumuz) ──
const CONFETTI_COLORS = [
  "#F9E04B",
  "#4CAF50",
  "#FF6B6B",
  "#4A90D9",
  "#B983FF",
  "#FF9F43",
];

function ConfettiPiece({ delay, left }: { delay: number; left: number }) {
  const translateY = useRef(new Animated.Value(-30)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const color =
    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 700,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 6,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2200,
          delay: 1400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 6],
    outputRange: ["0deg", "2160deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top: 0,
        width: 8,
        height: 14,
        backgroundColor: color,
        borderRadius: 2,
        opacity,
        transform: [{ translateY }, { rotate: spin }],
      }}
    />
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * SCREEN_WIDTH,
    delay: Math.random() * 400,
  }));
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} delay={p.delay} left={p.left} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F5F0" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },
  emptyDesc: { fontSize: 13, color: "#8A8A8A", marginTop: 6 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  exitBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E8E3DC",
    marginRight: 10,
    flexShrink: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    flexWrap: "wrap",
  },
  playerName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginRight: 6,
    flexShrink: 1,
  },
  levelPill: {
    backgroundColor: "#E91E63",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    flexShrink: 0,
  },
  levelPillText: { fontSize: 9, fontWeight: "bold", color: "#fff" },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "#E0DACE",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  streakPillImg: { width: 16, height: 16 },
  streakPillText: { fontSize: 10, fontWeight: "bold", color: "#8A8A8A" },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E0E0E0",
    marginBottom: 3,
    overflow: "hidden",
  },
  xpBarFill: { height: "100%", backgroundColor: "#4CAF50" },
  xpText: { fontSize: 9, color: "#8A8A8A" },
  counterPill: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  counterText: { fontSize: 11, fontWeight: "bold", color: "#F9E04B" },

  sectionHeader: { paddingHorizontal: 20, paddingTop: 4 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#8A8A8A",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },

  pipRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  pipTouchArea: { alignItems: "center", justifyContent: "center" },
  pip: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  pipActive: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#1A1A1A",
  },
  pipDone: { backgroundColor: "#4CAF50" },
  pipSkipped: { backgroundColor: "#FF4F4F" },

  cardStack: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    position: "relative",
    maxHeight: 420,
  },
  bgCard: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 0,
    height: "92%",
    borderRadius: 28,
    backgroundColor: "#fff",
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },

  repeatBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  repeatBadgeText: { fontSize: 11, fontWeight: "bold", color: "#fff" },

  hintBadgeRight: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(76,175,80,0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: "-15deg" }],
  },
  hintTextRight: { fontSize: 18, fontWeight: "bold", color: "#4CAF50" },
  hintBadgeLeft: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(255,107,53,0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: "15deg" }],
  },
  hintTextLeft: { fontSize: 18, fontWeight: "bold", color: "#FF6B35" },

  cardTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  taskNo: {
    flex: 1,
    fontSize: 10,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  difficultyText: { fontSize: 12, fontWeight: "bold", color: "#fff" },

  taskTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    lineHeight: 29,
  },
  taskDesc: { fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 22 },

  closingLine: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontStyle: "italic",
    marginBottom: 10,
  },

  swipeHint: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    opacity: 0.8,
  },

  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 20,
  },
  btnSkip: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFECEC",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDone: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBack: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  celebrationCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "85%",
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginTop: 8,
  },
  celebrationText: {
    fontSize: 14,
    color: "#8A8A8A",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  celebrationCoinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
    marginBottom: 20,
  },
  celebrationCoinImg: { width: 16, height: 16 },
  celebrationCoinText: { fontSize: 14, color: "#8A8A8A", lineHeight: 20 },
  celebrationBtnPrimary: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  celebrationBtnPrimaryText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  celebrationBtnGhost: { paddingVertical: 8 },
  celebrationBtnGhostText: {
    color: "#8A8A8A",
    fontWeight: "bold",
    fontSize: 13,
  },
});
