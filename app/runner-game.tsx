import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { CHARACTERS } from "../characters";
// ^ adjust this import path if runner-game.tsx doesn't sit directly in `app/`

const COLORS = {
  appBg: "#FBF3E8",
  cardBg: "#FFFFFF",
  cardBorder: "#F0DCC0",
  cardBorderDeep: "#DEBE8E",
  textPrimary: "#3A281A",
  textSecondary: "#9C8265",
  accent: "#E8633A",
  accentBorder: "#F0906E",
  accentBorderDeep: "#B8461F",
  Coin: "#B5834F",
  CoinBorder: "#C9975F",
  CoinBorderDeep: "#8A6338",
  sky: "#FFD9B3",
  skyBorder: "#FFC088",
  skyBorderDeep: "#F0985A",
  ground: "#D9944F",
  groundDark: "#B06E30",
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const TRACK_HEIGHT = 340;
const GROUND_OFFSET = 52; // ground strip height, from the bottom of the track
const CHAR_SIZE = 84;
const CHAR_X = 32; // fixed horizontal position of the character
const OBSTACLE_WIDTH = 36; // taban genişlik — kümelerde küçük/büyük varyasyon uygulanır
const OBSTACLE_HEIGHT = 22;
const JUMP_HEIGHT = 96;
const JUMP_DURATION = 300; // ms, up and down each
const GROUNDED_THRESHOLD = 24; // px lift below which the character can still collide
const CHAR_GROUND_NUDGE = 14; // karakterin kendi çiziminde ayak altındaki boşluğu telafi eder
const HITBOX_INSET = 23; // px of forgiveness shaved off both sides of the collision box

const KEY_Coin_COUNT = "gardenCoinCount"; // same key garden.tsx reads
const KEY_BEST_SCORE = "runnerBestScore";
const KEY_SELECTED_CHARACTER = "selectedCharacter"; // same key settings/character-select use

const Coin_PER_POINTS = 100; // her 100 puan = 1 coin

// Emoji/ikon yerine yerden yükselen küçük "tümsekler" — renk çeşitliliği için palet.
const BUMP_COLORS = [
  { bg: "#8B4A2B", border: "#A8683F", borderDeep: "#5E2F16" },
  { bg: "#C1592E", border: "#D97B4F", borderDeep: "#8A3A18" },
  { bg: "#7A4A2E", border: "#96674A", borderDeep: "#4E2D18" },
  { bg: "#A6431F", border: "#C4663F", borderDeep: "#6E2A0F" },
];

type Obstacle = {
  id: number;
  x: number;
  colorIdx: number;
  width: number;
  height: number;
  passed: boolean;
};

export default function RunnerGameScreen() {
  const router = useRouter();
  const [charIdx, setCharIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [CoinEarned, setCoinEarned] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const jumpAnim = useRef(new Animated.Value(0)).current;
  const jumpYRef = useRef(0);
  const isJumpingRef = useRef(false);
  const jumpQueuedRef = useRef(false);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const speedRef = useRef(180); // px/sec
  const distanceRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const nextSpawnGapRef = useRef(900);
  const obstaclesDataRef = useRef<Obstacle[]>([]);
  const idCounterRef = useRef(0);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const savedRef = useRef(false);

  const character = CHARACTERS[charIdx];

  useEffect(() => {
    const id = jumpAnim.addListener(({ value }) => {
      jumpYRef.current = value;
    });
    return () => jumpAnim.removeListener(id);
  }, [jumpAnim]);

  const loadInfo = useCallback(async () => {
    const idx =
      parseInt((await AsyncStorage.getItem(KEY_SELECTED_CHARACTER)) ?? "0") ||
      0;
    setCharIdx(Math.min(Math.max(idx, 0), CHARACTERS.length - 1));
    const best =
      parseInt((await AsyncStorage.getItem(KEY_BEST_SCORE)) ?? "0") || 0;
    setBestScore(best);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  }, []);

  const resetGame = useCallback(() => {
    stopLoop();
    setGameOver(false);
    gameOverRef.current = false;
    savedRef.current = false;
    setScore(0);
    scoreRef.current = 0;
    setCoinEarned(0);
    setIsNewBest(false);
    setObstacles([]);
    obstaclesDataRef.current = [];
    speedRef.current = 155;
    distanceRef.current = 0;
    spawnTimerRef.current = 0;
    nextSpawnGapRef.current = 1400;
    idCounterRef.current = 0;
    jumpAnim.setValue(0);
    isJumpingRef.current = false;
    jumpQueuedRef.current = false;
    setRunning(false);
  }, [jumpAnim, stopLoop]);

  useFocusEffect(
    useCallback(() => {
      loadInfo();
      resetGame();
      return () => {
        stopLoop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadInfo]),
  );

  const saveResult = useCallback(async (finalScore: number) => {
    if (savedRef.current) return;
    savedRef.current = true;

    const prevBest =
      parseInt((await AsyncStorage.getItem(KEY_BEST_SCORE)) ?? "0") || 0;
    const newBest = Math.max(prevBest, finalScore);
    // Her 100 puan = 1 coin — ama sadece önceki en yüksek skoru AŞAN kısım
    // için. Aynı ya da daha düşük skorla tekrar oynayınca daha önce
    // alınmış coin aralıkları tekrar verilmez.
    const prevBracket = Math.floor(prevBest / Coin_PER_POINTS);
    const newBracket = Math.floor(newBest / Coin_PER_POINTS);
    const earned = Math.max(0, newBracket - prevBracket);
    const currentCoin =
      parseInt((await AsyncStorage.getItem(KEY_Coin_COUNT)) ?? "0") || 0;

    await AsyncStorage.multiSet([
      [KEY_BEST_SCORE, String(newBest)],
      [KEY_Coin_COUNT, String(currentCoin + earned)],
    ]);

    setBestScore(newBest);
    setIsNewBest(finalScore > prevBest && finalScore > 0);
    setCoinEarned(earned);

    // TODO: skor tablosu — Firestore'a { name, score, charIdx, ts } yaz.
    // firebaseConfig.ts'teki db bağlantısını görünce burayı tamamlarız.
  }, []);

  const triggerGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setRunning(false);
    setGameOver(true);
    stopLoop();
    saveResult(scoreRef.current);
  }, [saveResult, stopLoop]);

  const loop = useCallback(
    (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min(48, ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      if (!gameOverRef.current) {
        distanceRef.current += speedRef.current * dt;
        speedRef.current = Math.min(330, 155 + distanceRef.current * 0.011);

        spawnTimerRef.current += dt * 1000;
        if (spawnTimerRef.current >= nextSpawnGapRef.current) {
          spawnTimerRef.current = 0;
          nextSpawnGapRef.current = 1300 + Math.random() * 1200;

          // Chrome'daki dino oyunu gibi: sonsuz rastgele boyut yerine sabit
          // birkaç engel tipi — tek küçük, tek büyük, ya da 2'li grup.
          // İkili grup sadece hız yeterince yüksekken çıkar — düşük hızda
          // zıplamanın "havada güvenli" penceresi bu engeli fiziksel olarak
          // atlamaya yetmiyordu.
          const canSpawnGroup = speedRef.current >= 230;
          const roll = Math.random();
          const preset = !canSpawnGroup
            ? roll < 0.5
              ? "small"
              : "large"
            : roll < 0.4
              ? "small"
              : roll < 0.7
                ? "large"
                : "group";

          let cursorX = SCREEN_WIDTH + 20;
          const pushBump = (w: number, h: number) => {
            const colorIdx = Math.floor(Math.random() * BUMP_COLORS.length);
            obstaclesDataRef.current.push({
              id: idCounterRef.current++,
              x: cursorX,
              colorIdx,
              width: w,
              height: h,
              passed: false,
            });
            cursorX += w - 8; // neredeyse bitişik — tek geniş engel gibi
          };

          if (preset === "small") {
            pushBump(OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
          } else if (preset === "large") {
            pushBump(
              Math.round(OBSTACLE_WIDTH * 1.4),
              Math.round(OBSTACLE_HEIGHT * 1.4),
            );
          } else {
            pushBump(OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
            pushBump(OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
          }
        }

        obstaclesDataRef.current.forEach((o) => {
          o.x -= speedRef.current * dt;
        });
        obstaclesDataRef.current = obstaclesDataRef.current.filter(
          (o) => o.x > -60,
        );

        const charLeft = CHAR_X;
        const charRight = CHAR_X + CHAR_SIZE;

        // Chrome'daki dino oyunu gibi: skor engelden değil, kat edilen
        // mesafeden sürekli artar.
        const newScore = Math.floor(distanceRef.current / 6);
        if (newScore !== scoreRef.current) {
          scoreRef.current = newScore;
          setScore(newScore);
        }

        const grounded = jumpYRef.current < GROUNDED_THRESHOLD;
        if (grounded) {
          for (const o of obstaclesDataRef.current) {
            const margin = o.width * 0.2;
            const oLeft = o.x + margin;
            const oRight = o.x + o.width - margin;
            if (
              oRight > charLeft + HITBOX_INSET &&
              oLeft < charRight - HITBOX_INSET
            ) {
              triggerGameOver();
              break;
            }
          }
        }

        setObstacles([...obstaclesDataRef.current]);
      }

      if (!gameOverRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      }
    },
    [triggerGameOver],
  );

  const startGame = useCallback(() => {
    resetGame();
    setRunning(true);
    requestAnimationFrame((ts) => {
      lastTsRef.current = ts;
      rafRef.current = requestAnimationFrame(loop);
    });
  }, [resetGame, loop]);

  const runJump = useCallback(() => {
    isJumpingRef.current = true;
    Animated.sequence([
      Animated.timing(jumpAnim, {
        toValue: JUMP_HEIGHT,
        duration: JUMP_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(jumpAnim, {
        toValue: 0,
        duration: JUMP_DURATION,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(() => {
      isJumpingRef.current = false;
      // Havadayken tekrar dokunulduysa, iner inmez otomatik ikinci zıplama —
      // tempolu oynarken tıklamalar kaybolmasın diye.
      if (jumpQueuedRef.current && !gameOverRef.current) {
        jumpQueuedRef.current = false;
        runJump();
      }
    });
  }, [jumpAnim]);

  const handleJump = useCallback(() => {
    if (gameOverRef.current) return;
    if (isJumpingRef.current) {
      jumpQueuedRef.current = true; // kuyruğa al, inince otomatik tetiklenir
      return;
    }
    runJump();
  }, [runJump]);

  const handleTrackPress = () => {
    if (gameOver) return;
    if (!running) {
      startGame();
    } else {
      handleJump();
    }
  };

  const translateY = Animated.multiply(jumpAnim, -1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Engel Koşusu</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subtitle}>{character.name} ile koşuyorsun</Text>

      {/* OYUN ALANI — ortalanmış */}
      <View style={styles.trackCenterWrap}>
        <View style={styles.aboveTrackRow}>
          <View style={styles.scoreBadge}>
            <Ionicons name="flag" size={12} color="#fff" />
            <Text style={styles.scoreBadgeText}>
              {score} · en iyi {bestScore}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setHelpVisible(true)}
            activeOpacity={0.7}
            style={styles.helpBadge}
          >
            <Text style={styles.helpBadgeText}>?</Text>
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPressIn={handleTrackPress}>
          <View style={styles.trackFrame}>
            <View style={styles.track}>
              <View style={styles.ground} />

              <Animated.View
                style={[
                  styles.character,
                  {
                    left: CHAR_X,
                    bottom: GROUND_OFFSET - CHAR_GROUND_NUDGE,
                    transform: [{ translateY }],
                  },
                ]}
              >
                <LottieView
                  source={character.file}
                  autoPlay
                  loop
                  style={{ width: CHAR_SIZE, height: CHAR_SIZE }}
                />
              </Animated.View>

              {obstacles.map((o) => {
                const c = BUMP_COLORS[o.colorIdx % BUMP_COLORS.length];
                return (
                  <View
                    key={o.id}
                    style={[
                      styles.obstacleBump,
                      {
                        left: o.x,
                        bottom: GROUND_OFFSET - 6,
                        width: o.width,
                        height: o.height,
                        borderTopLeftRadius: o.height,
                        borderTopRightRadius: o.height,
                        backgroundColor: c.bg,
                        borderColor: c.border,
                        borderBottomColor: c.borderDeep,
                      },
                    ]}
                  />
                );
              })}

              {!running && !gameOver && (
                <View style={styles.startOverlay} pointerEvents="none">
                  <View style={styles.startBadge}>
                    <Text style={styles.startText}>Başlamak için dokun</Text>
                  </View>
                  <View style={[styles.startBadge, styles.startBadgeSmall]}>
                    <Text style={styles.startSubText}>
                      Zıplamak için ekrana dokun
                    </Text>
                  </View>
                </View>
              )}

              {gameOver && (
                <View style={styles.resultCard}>
                  <Text style={{ fontSize: 30 }}>
                    {isNewBest ? "🏆" : "🌵"}
                  </Text>
                  <Text style={styles.resultTitle}>
                    {isNewBest ? "Yeni rekor!" : "Oyun bitti"}
                  </Text>
                  <Text style={styles.resultText}>
                    Skor: {score} · En iyi: {bestScore}
                  </Text>
                  {CoinEarned > 0 && (
                    <View style={styles.CoinRow}>
                      <Ionicons name="hammer" size={14} color="#fff" />
                      <Text style={styles.CoinRowText}>+{CoinEarned} coin</Text>
                    </View>
                  )}
                  <View style={styles.resultBtnRow}>
                    <TouchableOpacity
                      style={[styles.resultBtn, styles.resultBtnPrimary]}
                      onPress={startGame}
                    >
                      <Text style={styles.resultBtnPrimaryText}>
                        Tekrar Oyna
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.resultBtn, styles.resultBtnSecondary]}
                      onPress={() => router.back()}
                    >
                      <Text style={styles.resultBtnSecondaryText}>
                        Geri Dön
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>

      {/* SKOR TABLOSU — yer tutucu, Firestore bağlanınca dolacak */}
      <View style={styles.leaderboardCard}>
        <View style={styles.leaderboardHeader}>
          <Ionicons name="trophy" size={16} color={COLORS.Coin} />
          <Text style={styles.leaderboardTitle}>Skor Tablosu</Text>
        </View>
        <Text style={styles.leaderboardEmpty}>
          En yüksek skorlar yakında burada — bağlantı kuruluyor.
        </Text>
      </View>

      <RunnerHelpModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />
    </SafeAreaView>
  );
}

function RunnerHelpModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.helpOverlay}>
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Nasıl oynanır?</Text>
          <HelpLine text="Ekrana dokun — karakter zıplar, tümseklere çarpmadan geç." />
          <HelpLine text="Skor, kat ettiğin mesafeye göre sürekli artar — engel atlamak puan vermez, hayatta kalmak verir." />
          <HelpLine text="Her 100 puan = 1 coin. Ama sadece önceki en yüksek skorunu geçtiğin kısım için — aynı skoru tekrar tekrar yapmak ekstra coin vermez." />
          <HelpLine text="Zamanla hız artar, tümsekler bazen ikili gruplar halinde gelir." />
          <TouchableOpacity style={styles.helpCloseBtn} onPress={onClose}>
            <Text style={styles.helpCloseBtnText}>Anladım</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function HelpLine({ text }: { text: string }) {
  return (
    <View style={styles.helpLine}>
      <View style={styles.helpLineBadge} />
      <Text style={styles.helpLineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.appBg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.textPrimary },
  helpBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.accentBorder,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.accentBorderDeep,
  },
  helpBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  aboveTrackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: COLORS.accentBorder,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.accentBorderDeep,
  },
  scoreBadgeText: { fontSize: 11, fontWeight: "bold", color: "#fff" },

  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },

  trackCenterWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trackFrame: {
    marginHorizontal: 12,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: COLORS.skyBorder,
    borderBottomWidth: 9,
    borderBottomColor: COLORS.skyBorderDeep,
  },
  track: {
    width: SCREEN_WIDTH - 24,
    height: TRACK_HEIGHT,
    borderRadius: 23,
    backgroundColor: COLORS.sky,
    overflow: "hidden",
  },
  ground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: GROUND_OFFSET,
    backgroundColor: COLORS.ground,
    borderTopWidth: 4,
    borderTopColor: COLORS.groundDark,
  },
  character: {
    position: "absolute",
    width: CHAR_SIZE,
    height: CHAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  obstacleBump: {
    position: "absolute",
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 2,
    borderBottomWidth: 5,
  },

  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  startBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.cardBorderDeep,
  },
  startBadgeSmall: { marginTop: 10, paddingVertical: 5 },
  startText: { fontSize: 15, fontWeight: "bold", color: COLORS.textPrimary },
  startSubText: { fontSize: 11, color: COLORS.textSecondary },

  resultCard: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "50%",
    marginTop: -100,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: COLORS.cardBorder,
    borderBottomWidth: 7,
    borderBottomColor: COLORS.cardBorderDeep,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  resultText: { fontSize: 12, color: COLORS.textSecondary },
  CoinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.Coin,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: COLORS.CoinBorder,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.CoinBorderDeep,
  },
  CoinRowText: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  resultBtnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  resultBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  resultBtnPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentBorder,
    borderBottomColor: COLORS.accentBorderDeep,
  },
  resultBtnPrimaryText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  resultBtnSecondary: {
    backgroundColor: "#F5F2EC",
    borderColor: COLORS.cardBorder,
    borderBottomColor: COLORS.cardBorderDeep,
  },
  resultBtnSecondaryText: {
    color: COLORS.textPrimary,
    fontWeight: "bold",
    fontSize: 12,
  },

  leaderboardCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderBottomWidth: 5,
    borderBottomColor: COLORS.cardBorderDeep,
  },
  leaderboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  leaderboardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  leaderboardEmpty: { fontSize: 11, color: COLORS.textSecondary },

  helpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  helpCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    padding: 22,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderBottomWidth: 6,
    borderBottomColor: COLORS.cardBorderDeep,
  },
  helpTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 14,
    textAlign: "center",
  },
  helpLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  helpLineBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 3,
    backgroundColor: COLORS.accent,
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.accentBorderDeep,
  },
  helpLineText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
  },
  helpCloseBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
    borderWidth: 2,
    borderColor: COLORS.accentBorder,
    borderBottomWidth: 5,
    borderBottomColor: COLORS.accentBorderDeep,
  },
  helpCloseBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
