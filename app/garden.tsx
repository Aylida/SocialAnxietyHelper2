import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { FruitType, PLANT_IMAGES, PLANT_THUMBS } from "./plantImages";
// ^ adjust this import path to wherever you place plantImages.ts
//   relative to this file (see the comment at the top of plantImages.ts).

const GOLD_COIN = require("../assets/images/gold_coin.png");
// ^ garden.tsx is directly in app/, so this is one level up to project root

const COLORS = {
  appBg: "#FBF6EC",
  cardBg: "#FFFFFF",
  heroCardBg: "#FDEBD3",
  heroCardBorder: "#F0D2A0",
  heroCardBorderDeep: "#E0B472",
  pipeCardBg: "#E1EAF7",
  pipeCardBorder: "#C3D6F0",
  pipeCardBorderDeep: "#9DB8DE",
  chipBg: "#E3F2D9",
  listCardBorder: "#F0E9DA",
  listCardBorderDeep: "#E2D5B8",
  textPrimary: "#3A2E22",
  textSecondary: "#9C8F80",
  accent: "#3BAD7A",
  coin: "#B5834F",
  shadow: "#C9A878",
};

// ---- Growth stages (9 total: soil -> seed -> ... -> ripe fruit on a branch) ----
const PLANT_STAGE_NAMES = [
  "Toprak",
  "Tohum",
  "Filiz",
  "Fidan",
  "Genç Fidan",
  "Yapraklanan Fidan",
  "Gelişen Bitki",
  "Meyve Bağlıyor",
  "Olgunlaştı",
];
const MAX_STAGE = 8; // index of the last stage (Olgunlaştı)
const TOTAL_WATERS_NEEDED = 10; // su oyunundaki 10 seviyeyle eşleşiyor (4 -> 2048)

// Her aşamaya geçmek için gereken kümülatif sulama sayısı (0..MAX_STAGE).
// 10 sulama 8 aşama geçişine tam bölünmediği için (1.25), bazı aşamalar
// şeklinde dağıtılıyor.
const STAGE_THRESHOLDS = Array.from({ length: MAX_STAGE + 1 }, (_, i) =>
  Math.floor((i * TOTAL_WATERS_NEEDED) / MAX_STAGE),
);

function stageFromWaterCount(waterCount: number): number {
  let stage = 0;
  for (let i = 1; i <= MAX_STAGE; i++) {
    if (waterCount >= STAGE_THRESHOLDS[i]) stage = i;
  }
  return stage;
}

const KEY_WATER_COUNT = "gardenWaterCount";
const KEY_LAST_WATER_DATE = "gardenLastWaterDate";
const KEY_FRUIT_LEVEL = "gardenFruitLevel";
const KEY_COIN_COUNT = "gardenCoinCount";
const KEY_GAME_LEVEL = "gardenGameLevel"; // same key garden-water-game.tsx uses

const COIN_PER_HARVEST = 10;

// ---- Level order: one fruit per level, in this order. ----
const FRUIT_ORDER: FruitType[] = [
  "domates",
  "cilek",
  "biber",
  "limon",
  "karpuz",
  "patlican",
];
const TOTAL_LEVELS = FRUIT_ORDER.length;

const FRUIT_META: Record<FruitType, { label: string; emoji: string }> = {
  domates: { label: "Domates", emoji: "🍅" },
  cilek: { label: "Çilek", emoji: "🍓" },
  biber: { label: "Biber", emoji: "🌶️" },
  limon: { label: "Limon", emoji: "🍋" },
  karpuz: { label: "Karpuz", emoji: "🍉" },
  patlican: { label: "Patlıcan", emoji: "🍆" },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Images are 600x700, so keep that aspect ratio at any display width.
const IMAGE_ASPECT = 700 / 600;

function PlantImage({
  stage,
  fruitType,
  width = 170,
}: {
  stage: number;
  fruitType: FruitType;
  width?: number;
}) {
  const source = PLANT_IMAGES[fruitType][stage];
  return (
    <Image
      source={source}
      style={{ width, height: width * IMAGE_ASPECT }}
      resizeMode="contain"
    />
  );
}

// Yatay "boru" ilerleme çubuğu — sulama sayısı arttıkça içi dolar.
// Her aşama geçişinde ince bir bölme çizgisi (tick) gösterir.
function GrowthPipeBar({ waterCount }: { waterCount: number }) {
  const clamped = Math.min(waterCount, TOTAL_WATERS_NEEDED);
  const progress = clamped / TOTAL_WATERS_NEEDED;

  return (
    <View style={styles.pipeWrap}>
      <View style={styles.pipeTrack}>
        <View style={[styles.pipeFill, { width: `${progress * 100}%` }]} />
        {Array.from({ length: MAX_STAGE - 1 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pipeTick,
              { left: `${((i + 1) / MAX_STAGE) * 100}%` },
            ]}
          />
        ))}
      </View>
      <Text style={styles.pipeLabelText}>
        {clamped}/{TOTAL_WATERS_NEEDED} sulama
      </Text>
    </View>
  );
}

export default function GardenScreen() {
  const router = useRouter();
  const [waterCount, setWaterCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastWaterDate, setLastWaterDate] = useState<string | null>(null);
  const [fruitLevelIndex, setFruitLevelIndex] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [harvesting, setHarvesting] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevStageRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    const count =
      parseInt((await AsyncStorage.getItem(KEY_WATER_COUNT)) ?? "0") || 0;
    const lastDate = await AsyncStorage.getItem(KEY_LAST_WATER_DATE);
    const level =
      parseInt((await AsyncStorage.getItem(KEY_FRUIT_LEVEL)) ?? "0") || 0;
    const coin =
      parseInt((await AsyncStorage.getItem(KEY_COIN_COUNT)) ?? "0") || 0;
    setWaterCount(count);
    setLastWaterDate(lastDate);
    setFruitLevelIndex(Math.min(Math.max(level, 0), TOTAL_LEVELS - 1));
    setCoinCount(coin);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const stage = stageFromWaterCount(waterCount);
  const currentFruitType = FRUIT_ORDER[fruitLevelIndex];
  const fruit = FRUIT_META[currentFruitType];
  const matured = stage === MAX_STAGE;
  const isLastLevel = fruitLevelIndex === TOTAL_LEVELS - 1;

  // TEST: sınırsız sulama açık — testi bitirince alttaki satırı geri aç, üsttekini sil
  // const canWaterToday = lastWaterDate !== todayKey();
  const canWaterToday = true;

  useEffect(() => {
    if (prevStageRef.current !== null && prevStageRef.current !== stage) {
      scaleAnim.setValue(0.7);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 55,
      }).start();
    }
    prevStageRef.current = stage;
  }, [stage, scaleAnim]);

  const nextStageWaters =
    STAGE_THRESHOLDS[Math.min(stage + 1, MAX_STAGE)] - waterCount;

  const handleHarvest = async () => {
    if (harvesting) return;
    setHarvesting(true);

    const newCoin = coinCount + COIN_PER_HARVEST;
    const nextLevel = Math.min(fruitLevelIndex + 1, TOTAL_LEVELS - 1);

    await AsyncStorage.multiSet([
      [KEY_COIN_COUNT, String(newCoin)],
      [KEY_FRUIT_LEVEL, String(nextLevel)],
      [KEY_WATER_COUNT, "0"],
      [KEY_GAME_LEVEL, "0"],
    ]);

    setCoinCount(newCoin);
    setFruitLevelIndex(nextLevel);
    setWaterCount(0);
    setHarvesting(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sakinlik Bahçesi</Text>
        <View style={styles.coinBadge}>
          <Image source={GOLD_COIN} style={styles.coinBadgeImg} />
          <Text style={styles.coinBadgeText}>{coinCount}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.gardenCard}>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>
              SEVİYE {fruitLevelIndex + 1}/{TOTAL_LEVELS}
            </Text>
          </View>
          <Text style={styles.fruitLabel}>
            {fruit.emoji} {fruit.label} Fidanı
          </Text>

          <View style={styles.plantSpotlight}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <PlantImage
                stage={stage}
                fruitType={currentFruitType}
                width={150}
              />
            </Animated.View>
          </View>

          <Text style={styles.stageName}>{PLANT_STAGE_NAMES[stage]}</Text>
          <Text style={styles.stageSub}>
            {!matured
              ? `Bir sonraki aşama için ${nextStageWaters} sulama kaldı`
              : `${fruit.label} olgunlaştı ${fruit.emoji}`}
          </Text>

          {!matured ? (
            <TouchableOpacity
              style={[
                styles.waterBtn,
                !canWaterToday && styles.waterBtnDisabled,
              ]}
              onPress={() => canWaterToday && router.push("/garden-water-game")}
              disabled={!canWaterToday}
              activeOpacity={0.85}
            >
              <Ionicons
                name="water"
                size={18}
                color={canWaterToday ? "#fff" : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.waterBtnText,
                  !canWaterToday && styles.waterBtnTextDisabled,
                ]}
              >
                {canWaterToday ? "Su Biriktir" : "Bugün sulandı, yarın gel"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.harvestBtn}
              onPress={handleHarvest}
              disabled={harvesting}
              activeOpacity={0.85}
            >
              <Image source={GOLD_COIN} style={styles.harvestBtnCoin} />
              <Text style={styles.harvestBtnText}>
                Hasat Et (+{COIN_PER_HARVEST} Coin)
              </Text>
            </TouchableOpacity>
          )}

          {matured && (
            <Text style={styles.harvestHint}>
              {isLastLevel
                ? "Son seviye — hasat edince aynı bitkiyi tekrar ekersin"
                : `Hasat edince ${FRUIT_META[FRUIT_ORDER[fruitLevelIndex + 1]].label} Fidanı'na geçersin`}
            </Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>SULAMA İLERLEMESİ</Text>
        <View style={styles.pipeCard}>
          <GrowthPipeBar waterCount={waterCount} />
          {!matured && (
            <Text style={styles.pipeNextText}>
              Sıradaki aşama: {PLANT_STAGE_NAMES[stage + 1]} · {nextStageWaters}{" "}
              sulama kaldı
            </Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>BAHÇE SEVİYELERİ</Text>
        <View style={styles.stageListCard}>
          {FRUIT_ORDER.map((ft, i) => {
            const meta = FRUIT_META[ft];
            const done =
              i < fruitLevelIndex || (i === fruitLevelIndex && matured);
            const active = i === fruitLevelIndex;
            return (
              <View
                key={ft}
                style={[styles.stageRow, active && styles.stageRowActive]}
              >
                <View
                  style={[
                    styles.stageIconWrap,
                    !active && !done && styles.stageIconWrapLocked,
                  ]}
                >
                  <Image
                    source={PLANT_THUMBS[ft]}
                    style={[
                      styles.levelThumb,
                      !active && !done && styles.levelThumbLocked,
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.stageRowName,
                      !active && !done && styles.stageRowNameLocked,
                    ]}
                  >
                    Seviye {i + 1} · {meta.label}
                  </Text>
                  <Text style={styles.stageRowDesc}>
                    {done
                      ? "Hasat edildi"
                      : active
                        ? "Şu an büyüyor"
                        : "Sırada"}
                  </Text>
                </View>
                {done && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.accent}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.textPrimary },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1E6D6",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: "#E8D5B8",
    borderBottomWidth: 3,
    borderBottomColor: "#D2B385",
  },
  coinBadgeImg: { width: 14, height: 14 },
  coinBadgeText: { fontSize: 12, fontWeight: "bold", color: COLORS.coin },

  gardenCard: {
    backgroundColor: COLORS.heroCardBg,
    borderRadius: 26,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: COLORS.heroCardBorder,
    borderBottomWidth: 6,
    borderBottomColor: COLORS.heroCardBorderDeep,
  },
  levelPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.heroCardBorder,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.heroCardBorderDeep,
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    color: "#A9702F",
  },
  fruitLabel: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
    color: COLORS.accent,
    marginBottom: 10,
  },
  plantSpotlight: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 2.5,
    borderColor: COLORS.heroCardBorder,
    borderBottomWidth: 5,
    borderBottomColor: COLORS.heroCardBorderDeep,
  },
  stageName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 4,
  },
  stageSub: {
    fontSize: 13,
    color: "#A9825A",
    marginBottom: 18,
    textAlign: "center",
  },

  waterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#5B9BD9",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderWidth: 2,
    borderColor: "#6FA8DC",
    borderBottomWidth: 5,
    borderBottomColor: "#3A6EA5",
  },
  waterBtnDisabled: { backgroundColor: "#E5E1D4" },
  waterBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  waterBtnTextDisabled: { color: COLORS.textSecondary },

  harvestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.coin,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderWidth: 2,
    borderColor: "#C9975F",
    borderBottomWidth: 5,
    borderBottomColor: "#8A6338",
  },
  harvestBtnCoin: { width: 18, height: 18 },
  harvestBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  harvestHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 10,
    textAlign: "center",
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  stageListCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },

  pipeCard: {
    backgroundColor: COLORS.pipeCardBg,
    borderRadius: 18,
    marginHorizontal: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.pipeCardBorder,
    borderBottomWidth: 5,
    borderBottomColor: COLORS.pipeCardBorderDeep,
  },
  pipeWrap: { width: "100%" },
  pipeTrack: {
    width: "100%",
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    justifyContent: "center",
  },
  pipeFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: "#6FA8DC",
  },
  pipeTick: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  pipeLabelText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4A6FA0",
    marginTop: 8,
    textAlign: "center",
  },
  pipeNextText: {
    fontSize: 12,
    color: "#4A6FA0",
    marginTop: 12,
    textAlign: "center",
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.listCardBorder,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.listCardBorderDeep,
  },
  stageRowActive: {
    borderColor: "#97C459",
    borderBottomColor: "#639922",
  },
  stageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.chipBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stageIconWrapLocked: { backgroundColor: "#F5F2EC" },
  levelThumb: { width: 34, height: 34 },
  levelThumbLocked: { opacity: 0.35 },
  stageRowName: { fontSize: 14, fontWeight: "bold", color: COLORS.textPrimary },
  stageRowNameLocked: { color: COLORS.textSecondary },
  stageRowDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
});
