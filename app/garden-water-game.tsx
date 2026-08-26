import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
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

const SCREEN_WIDTH = Dimensions.get("window").width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 48, 340);

const KEY_WATER_COUNT = "gardenWaterCount";
const KEY_LAST_WATER_DATE = "gardenLastWaterDate";
const KEY_GAME_LEVEL = "gardenGameLevel";
const KEY_THEME = "gardenGameTheme";
const KEY_GRID_STATE = "gardenGameGridState";

// Hedefler: ulaşılması gereken EN BÜYÜK karo değeri
// 2 hedef olamaz (oyun zaten 2'lik karolarla başlıyor), o yüzden 4'ten
// başlıyor: 10 seviye, en üst hedef 2048. 10 kazanç = 10 sulama, bonus yok.
const LEVEL_TARGETS = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
const GRID_SIZE = 4;

// ---- Temalar: her biri kendi karo rengi rampasını + tahta renklerini taşır ----
type TileStyle = { bg: string; text: string };
type Theme = {
  id: string;
  label: string;
  appBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentBorder: string;
  accentBorderDeep: string;
  backdropBg: string;
  backdropBorder: string;
  backdropBorderDeep: string;
  gridBg: string;
  gridBorder: string;
  gridBorderDeep: string;
  cellBg: string;
  swatch: string;
  tiles: TileStyle[];
};

const THEMES: Record<string, Theme> = {
  pink: {
    id: "pink",
    label: "Hayali",
    appBg: "#FBF2F7",
    textPrimary: "#34091e",
    textSecondary: "#802754",
    accent: "#802754",
    accentBorder: "#9C4670",
    accentBorderDeep: "#5C1B3C",
    backdropBg: "#0077b6",
    backdropBorder: "#3D96C9",
    backdropBorderDeep: "#005580",
    gridBg: "#03045e",
    gridBorder: "#1A1B7A",
    gridBorderDeep: "#010233",
    cellBg: "#FBF2F7",
    swatch: "#b37495",
    tiles: [
      { bg: "#f3dbea", text: "#430c27" },
      { bg: "#ecc5dd", text: "#430c27" },
      { bg: "#cc9ab5", text: "#34091e" },
      { bg: "#b37495", text: "#FFFFFF" },
      { bg: "#994d74", text: "#FFFFFF" },
      { bg: "#802754", text: "#FFFFFF" },
      { bg: "#660033", text: "#FFFFFF" },
      { bg: "#55062d", text: "#FFFFFF" },
      { bg: "#430c27", text: "#FFFFFF" },
      { bg: "#34091e", text: "#FFFFFF" },
      { bg: "#34091e", text: "#FFFFFF" },
      { bg: "#1f0611", text: "#FFFFFF" },
    ],
  },
  sunset: {
    id: "sunset",
    label: "Gün Batımı",
    appBg: "#FFF8EC",
    textPrimary: "#001219",
    textSecondary: "#005f73",
    accent: "#bb3e03",
    accentBorder: "#D4602A",
    accentBorderDeep: "#8A2E02",
    backdropBg: "#e9d8a6",
    backdropBorder: "#D9BE7A",
    backdropBorderDeep: "#C4A155",
    gridBg: "#0a9396",
    gridBorder: "#3DB0B3",
    gridBorderDeep: "#076F71",
    cellBg: "#94d2bd",
    swatch: "#ee9b00",
    tiles: [
      { bg: "#e9d8a6", text: "#001219" },
      { bg: "#94d2bd", text: "#001219" },
      { bg: "#ee9b00", text: "#001219" },
      { bg: "#ca6702", text: "#FFFFFF" },
      { bg: "#0a9396", text: "#FFFFFF" },
      { bg: "#bb3e03", text: "#FFFFFF" },
      { bg: "#ae2012", text: "#FFFFFF" },
      { bg: "#9b2226", text: "#FFFFFF" },
      { bg: "#005f73", text: "#FFFFFF" },
      { bg: "#001219", text: "#FFFFFF" },
      { bg: "#001219", text: "#FFFFFF" },
      { bg: "#00080d", text: "#FFFFFF" },
    ],
  },
  ocean: {
    id: "ocean",
    label: "Okyanus",
    appBg: "#F0FBFF",
    textPrimary: "#03045E",
    textSecondary: "#0077B6",
    accent: "#0077B6",
    accentBorder: "#3396CC",
    accentBorderDeep: "#005580",
    backdropBg: "#CAF0F8",
    backdropBorder: "#A8DCE8",
    backdropBorderDeep: "#82C4D6",
    gridBg: "#205299",
    gridBorder: "#3D6FB8",
    gridBorderDeep: "#163D73",
    cellBg: "rgb(81, 137, 193)",
    swatch: "#00B4D8",
    tiles: [
      { bg: "#CAF0F8", text: "#03045E" },
      { bg: "#ADE8F4", text: "#03045E" },
      { bg: "#90E0EF", text: "#03045E" },
      { bg: "#48CAE4", text: "#FFFFFF" },
      { bg: "#00B4D8", text: "#FFFFFF" },
      { bg: "#0096C7", text: "#FFFFFF" },
      { bg: "#0077B6", text: "#FFFFFF" },
      { bg: "#023E8A", text: "#FFFFFF" },
      { bg: "#03045E", text: "#FFFFFF" },
      { bg: "#03045E", text: "#FFFFFF" },
      { bg: "#03045E", text: "#FFFFFF" },
      { bg: "#01031f", text: "#FFFFFF" },
    ],
  },
};
const THEME_ORDER = ["pink", "sunset", "ocean"];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tileStyleFor(theme: Theme, value: number): TileStyle {
  const tier = Math.round(Math.log2(value));
  return theme.tiles[tier - 1] ?? theme.tiles[theme.tiles.length - 1];
}

function emptyGrid(): number[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}
function cloneGrid(g: number[][]): number[][] {
  return g.map((row) => [...row]);
}
function randomEmptyCell(g: number[][]): [number, number] | null {
  const empties: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++) if (g[r][c] === 0) empties.push([r, c]);
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}
function spawnTile(g: number[][]): number[][] {
  const next = cloneGrid(g);
  const cell = randomEmptyCell(next);
  if (cell) next[cell[0]][cell[1]] = 2;
  return next;
}
function slideRowLeft(row: number[]): {
  row: number[];
  gained: number;
  merges: number;
} {
  const nonZero = row.filter((v) => v !== 0);
  const result: number[] = [];
  let gained = 0;
  let merges = 0;
  for (let i = 0; i < nonZero.length; i++) {
    if (i < nonZero.length - 1 && nonZero[i] === nonZero[i + 1]) {
      const mergedVal = nonZero[i] * 2;
      result.push(mergedVal);
      gained += mergedVal;
      merges += 1;
      i++;
    } else {
      result.push(nonZero[i]);
    }
  }
  while (result.length < GRID_SIZE) result.push(0);
  return { row: result, gained, merges };
}
function transpose(g: number[][]): number[][] {
  const t = emptyGrid();
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++) t[c][r] = g[r][c];
  return t;
}
function reverseRows(g: number[][]): number[][] {
  return g.map((row) => [...row].reverse());
}
function move(g: number[][], direction: "left" | "right" | "up" | "down") {
  let working = cloneGrid(g);
  if (direction === "right") working = reverseRows(working);
  if (direction === "up") working = transpose(working);
  if (direction === "down") working = reverseRows(transpose(working));

  let gained = 0;
  let merges = 0;
  const newRows = working.map((row) => {
    const res = slideRowLeft(row);
    gained += res.gained;
    merges += res.merges;
    return res.row;
  });
  let result = newRows;
  if (direction === "right") result = reverseRows(result);
  if (direction === "up") result = transpose(result);
  if (direction === "down") result = transpose(reverseRows(result));

  const moved = JSON.stringify(result) !== JSON.stringify(g);
  return { grid: result, gained, merges, moved };
}
function hasMovesLeft(g: number[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (g[r][c] === 0) return true;
      if (c < GRID_SIZE - 1 && g[r][c] === g[r][c + 1]) return true;
      if (r < GRID_SIZE - 1 && g[r][c] === g[r + 1][c]) return true;
    }
  }
  return false;
}
function initGrid(): number[][] {
  let g = emptyGrid();
  g = spawnTile(g);
  g = spawnTile(g);
  return g;
}
function highestTile(g: number[][]): number {
  return Math.max(0, ...g.flat());
}

export default function GardenWaterGameScreen() {
  const router = useRouter();
  const [grid, setGrid] = useState<number[][]>(() => initGrid());
  const [mergeCount, setMergeCount] = useState(0);
  const [gameOver, setGameOver] = useState<"won" | "lost" | null>(null);
  const [saved, setSaved] = useState(false);
  const [levelIndex, setLevelIndex] = useState(0);
  const [themeId, setThemeId] = useState("pink");
  const [helpVisible, setHelpVisible] = useState(false);

  const swayAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(1)).current;
  const hasLoadedRef = useRef(false);

  const theme = THEMES[themeId] ?? THEMES.pink;
  const scoreTarget =
    LEVEL_TARGETS[Math.min(levelIndex, LEVEL_TARGETS.length - 1)];
  const isMaxLevel = levelIndex >= LEVEL_TARGETS.length - 1;
  const best = highestTile(grid);

  useFocusEffect(
    useCallback(() => {
      hasLoadedRef.current = false; // yükleme bitene kadar kaydetmeyi durdur
      (async () => {
        const savedLevel =
          parseInt((await AsyncStorage.getItem(KEY_GAME_LEVEL)) ?? "0") || 0;
        const clampedLevel = Math.min(savedLevel, LEVEL_TARGETS.length - 1);
        setLevelIndex(clampedLevel);
        const savedTheme = await AsyncStorage.getItem(KEY_THEME);
        if (savedTheme && THEMES[savedTheme]) setThemeId(savedTheme);

        // Yarım kalmış bir tahta varsa (aynı seviye için) kaldığı yerden
        // devam ettir; yoksa (ya da seviye değiştiyse) sıfırdan başla.
        let restored = false;
        const savedStateRaw = await AsyncStorage.getItem(KEY_GRID_STATE);
        if (savedStateRaw) {
          try {
            const savedState = JSON.parse(savedStateRaw);
            if (
              savedState &&
              savedState.levelIndex === clampedLevel &&
              Array.isArray(savedState.grid)
            ) {
              setGrid(savedState.grid);
              setMergeCount(savedState.mergeCount ?? 0);
              restored = true;
            }
          } catch {
            // bozuk kayıt — sıfırdan başla
          }
        }
        if (!restored) {
          setGrid(initGrid());
          setMergeCount(0);
        }
        setGameOver(null);
        setSaved(false);
        hasLoadedRef.current = true; // artık kaydetmeye izin var
      })();
    }, []),
  );

  // Oyunu her hamlede kaydet ki ekrandan çıkıp geri dönünce kaldığı
  // yerden devam etsin. Yükleme tamamlanmadan (hasLoadedRef) ya da oyun
  // bittiyse (gameOver) kaydetmiyoruz — aksi halde henüz okunmamış eski
  // kayıt, taze/rastgele tahtayla ezilebiliyordu.
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (gameOver) return;
    AsyncStorage.setItem(
      KEY_GRID_STATE,
      JSON.stringify({ grid, mergeCount, levelIndex }),
    ).catch(() => {});
  }, [grid, mergeCount, levelIndex, gameOver]);

  const selectTheme = async (id: string) => {
    setThemeId(id);
    await AsyncStorage.setItem(KEY_THEME, id);
  };

  const finishGame = async (result: "won" | "lost") => {
    setGameOver(result);
    await AsyncStorage.removeItem(KEY_GRID_STATE);
    if (!saved) {
      setSaved(true);
      // Sadece kazanınca su verilir — kaybederken merge sayısına göre su
      // vermek, 12 sulamalık büyüme dengesini bozuyordu.
      const waterToAdd = result === "won" ? 1 : 0;
      const currentCount =
        parseInt((await AsyncStorage.getItem(KEY_WATER_COUNT)) ?? "0") || 0;
      await AsyncStorage.multiSet([
        [KEY_WATER_COUNT, String(currentCount + waterToAdd)],
        [KEY_LAST_WATER_DATE, todayKey()],
      ]);

      if (result === "won" && !isMaxLevel) {
        await AsyncStorage.setItem(KEY_GAME_LEVEL, String(levelIndex + 1));
      }
    }
    if (result === "won") {
      // Kazanınca: yumuşak bir "zıplama" — sallantı yok, ürkütücü değil.
      Animated.sequence([
        Animated.timing(popAnim, {
          toValue: 1.08,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(popAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
          tension: 60,
        }),
      ]).start();
    } else {
      // Kaybedince: hafif bir sallantı (öncekinden daha az sert).
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleSwipe = (direction: "left" | "right" | "up" | "down") => {
    if (gameOver) return;
    const result = move(grid, direction);
    if (!result.moved) return;

    const newMergeCount = mergeCount + result.merges;
    setMergeCount(newMergeCount);

    if (highestTile(result.grid) >= scoreTarget) {
      setGrid(result.grid);
      finishGame("won");
      return;
    }

    const nextGrid = spawnTile(result.grid);
    setGrid(nextGrid);

    if (!hasMovesLeft(nextGrid)) {
      finishGame("lost");
    }
  };

  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state !== State.END) return;
    const { translationX, translationY } = event.nativeEvent;
    if (Math.abs(translationX) < 20 && Math.abs(translationY) < 20) return;
    if (Math.abs(translationX) > Math.abs(translationY)) {
      handleSwipe(translationX > 0 ? "right" : "left");
    } else {
      handleSwipe(translationY > 0 ? "down" : "up");
    }
  };

  const rotate = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-3deg", "3deg"],
  });
  const finalWaterAmount = gameOver === "won" ? 1 : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.appBg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Su Biriktir
        </Text>
        <View
          style={[
            styles.scoreBadge,
            {
              backgroundColor: theme.accent,
              borderColor: theme.accentBorder,
              borderBottomColor: theme.accentBorderDeep,
            },
          ]}
        >
          <Ionicons name="water" size={13} color="#fff" />
          <Text style={styles.scoreBadgeText}>
            {best}/{scoreTarget}
          </Text>
        </View>
      </View>

      <View style={styles.themeRow}>
        {THEME_ORDER.map((id) => {
          const t = THEMES[id];
          const active = id === themeId;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => selectTheme(id)}
              style={styles.themeSwatchWrap}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.themeSwatch,
                  {
                    backgroundColor: t.swatch,
                    borderColor: t.gridBorder,
                    borderBottomColor: t.gridBorderDeep,
                  },
                  active && styles.themeSwatchActive,
                ]}
              >
                {active && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text
                style={[
                  styles.themeSwatchLabel,
                  { color: theme.textSecondary },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.boardWrap}>
        <Text style={[styles.levelLabel, { color: theme.textSecondary }]}>
          Seviye {levelIndex + 1}/{LEVEL_TARGETS.length}
        </Text>
        <View style={styles.targetRow}>
          <Text style={[styles.targetLabel, { color: theme.textPrimary }]}>
            Hedef: {scoreTarget} karosuna ulaş
          </Text>
          <TouchableOpacity
            onPress={() => setHelpVisible(true)}
            activeOpacity={0.7}
            style={[
              styles.helpBadge,
              {
                backgroundColor: theme.accent,
                borderColor: theme.accentBorder,
                borderBottomColor: theme.accentBorderDeep,
              },
            ]}
          >
            <Text style={styles.helpBadgeText}>?</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.boardBackdrop,
            {
              backgroundColor: theme.backdropBg,
              borderColor: theme.backdropBorder,
              borderBottomColor: theme.backdropBorderDeep,
            },
          ]}
        >
          <PanGestureHandler onHandlerStateChange={onHandlerStateChange}>
            <Animated.View
              style={[
                styles.gridWrap,
                {
                  backgroundColor: theme.gridBg,
                  borderColor: theme.gridBorder,
                  borderBottomColor: theme.gridBorderDeep,
                  transform: [{ rotate }, { scale: popAnim }],
                },
              ]}
            >
              {grid.map((row, r) => (
                <View key={r} style={styles.gridRow}>
                  {row.map((val, c) => (
                    <AnimatedTile key={`${r}-${c}`} value={val} theme={theme} />
                  ))}
                </View>
              ))}
            </Animated.View>
          </PanGestureHandler>
        </View>

        {gameOver && (
          <View style={styles.resultCard}>
            {gameOver === "won" ? (
              <LottieView
                source={require("../assets/lottie/water_loader.json")}
                autoPlay
                loop={false}
                style={{ width: 110, height: 110 }}
              />
            ) : (
              <Text style={{ fontSize: 34 }}>🌊</Text>
            )}
            <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
              {gameOver === "won"
                ? isMaxLevel
                  ? "Tüm seviyeleri tamamladın! 🎉"
                  : "Seviye tamamlandı!"
                : "Hamle kalmadı"}
            </Text>
            <Text style={[styles.resultText, { color: theme.textSecondary }]}>
              {gameOver === "won"
                ? `En büyük: ${best} · +${finalWaterAmount} sulama`
                : `En büyük: ${best} · tekrar dene`}
            </Text>
            <TouchableOpacity
              style={[
                styles.doneBtn,
                {
                  backgroundColor: theme.accent,
                  borderColor: theme.accentBorder,
                  borderBottomColor: theme.accentBorderDeep,
                },
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.doneBtnText}>Bahçeye Dön</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <HelpModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

function HelpModal({
  visible,
  onClose,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.helpOverlay}>
        <View
          style={[
            styles.helpCard,
            {
              backgroundColor: "#FFFFFF",
              borderColor: theme.gridBorder,
              borderBottomColor: theme.gridBorderDeep,
            },
          ]}
        >
          <Text style={[styles.helpTitle, { color: theme.textPrimary }]}>
            Nasıl oynanır?
          </Text>
          <HelpLine
            text="Ekranı yukarı, aşağı, sağa veya sola kaydır — tüm karolar o yöne kayar."
            color={theme.textPrimary}
            theme={theme}
          />
          <HelpLine
            text="Aynı sayılı iki karo yan yana gelirse birleşir ve değeri ikiye katlanır."
            color={theme.textPrimary}
            theme={theme}
          />
          <HelpLine
            text="Hedef karoya (üstte yazan sayı) ulaşırsan seviyeyi kazanırsın."
            color={theme.textPrimary}
            theme={theme}
          />
          <HelpLine
            text="Kazanınca 1 sulama kazanırsın, kaybedersen de birleştirme sayına göre teselli suyu alırsın."
            color={theme.textPrimary}
            theme={theme}
          />
          <TouchableOpacity
            style={[
              styles.helpCloseBtn,
              {
                backgroundColor: theme.accent,
                borderColor: theme.accentBorder,
                borderBottomColor: theme.accentBorderDeep,
              },
            ]}
            onPress={onClose}
          >
            <Text style={styles.helpCloseBtnText}>Anladım</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function HelpLine({
  text,
  color,
  theme,
}: {
  text: string;
  color: string;
  theme: Theme;
}) {
  return (
    <View style={styles.helpLine}>
      <View
        style={[
          styles.helpLineBadge,
          {
            backgroundColor: theme.accent,
            borderColor: theme.accentBorder,
            borderBottomColor: theme.accentBorderDeep,
          },
        ]}
      />
      <Text style={[styles.helpLineText, { color }]}>{text}</Text>
    </View>
  );
}

function AnimatedTile({ value, theme }: { value: number; theme: Theme }) {
  const scale = useRef(new Animated.Value(value === 0 ? 1 : 0.6)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current && value !== 0) {
      const isMerge = value > prevValue.current && prevValue.current !== 0;
      scale.setValue(isMerge ? 1.25 : 0.5);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: isMerge ? 4 : 6,
        tension: 90,
      }).start();
    }
    prevValue.current = value;
  }, [value, scale]);

  const style = value > 0 ? tileStyleFor(theme, value) : null;

  return (
    <View style={styles.cellSlot}>
      <View style={[styles.cellBg, { backgroundColor: theme.cellBg }]} />
      {value > 0 && (
        <Animated.View
          style={[
            styles.cellTile,
            { backgroundColor: style!.bg, transform: [{ scale }] },
          ]}
        >
          <Text
            style={[
              styles.cellValue,
              {
                color: style!.text,
                fontSize: value >= 1000 ? 15 : value >= 100 ? 18 : 21,
              },
            ]}
          >
            {value}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const CELL_MARGIN = 5;
const CELL_SIZE = (BOARD_SIZE - CELL_MARGIN * 2 * GRID_SIZE - 16) / GRID_SIZE;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 2,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  helpBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  helpBadgeText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  helpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  helpCard: {
    borderRadius: 22,
    padding: 22,
    borderWidth: 2,
    borderBottomWidth: 6,
  },
  helpTitle: {
    fontSize: 17,
    fontWeight: "bold",
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
    borderWidth: 1.5,
    borderBottomWidth: 3,
  },
  helpLineText: { flex: 1, fontSize: 13, lineHeight: 19 },
  helpCloseBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  helpCloseBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  scoreBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },

  themeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 22,
    paddingBottom: 10,
  },
  themeSwatchWrap: { alignItems: "center" },
  themeSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  themeSwatchActive: { borderColor: "rgba(0,0,0,0.35)" },
  themeSwatchLabel: { fontSize: 10, fontWeight: "bold", marginTop: 4 },

  boardWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  targetLabel: { fontSize: 15, fontWeight: "bold" },

  boardBackdrop: {
    borderRadius: 28,
    padding: 14,
    borderWidth: 2.5,
    borderBottomWidth: 7,
  },
  gridWrap: {
    width: BOARD_SIZE,
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  gridRow: { flexDirection: "row" },
  cellSlot: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_MARGIN,
    alignItems: "center",
    justifyContent: "center",
  },
  cellBg: {
    ...StyleSheet.absoluteFillObject,
    margin: 0,
    borderRadius: 12,
  },
  cellTile: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cellValue: { fontWeight: "bold" },

  resultCard: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#EDE4D3",
    borderBottomWidth: 6,
    borderBottomColor: "#DCCFB5",
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  resultText: { fontSize: 13, marginBottom: 18 },
  doneBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  doneBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
