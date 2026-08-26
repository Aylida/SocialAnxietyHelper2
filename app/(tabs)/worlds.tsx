import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CHARACTERS } from "../../characters";
import CharacterAvatar from "../../components/CharacterAvatar";

const GOLD_COIN = require("../../assets/images/gold_coin.png"); // (tabs) klasöründen 2 üst dizine çıkıyor
const FLAME_ICON = require("../../assets/images/flame_icon.png");

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const CAT_KEYS = ["genel", "is", "okul", "mahalle", "romantik", "aile"];
const CAT_LABELS = ["Genel", "İş", "Okul", "Mahalle", "Romantik", "Aile"];
const CAT_ICONS: IoniconName[] = [
  "earth",
  "briefcase",
  "school",
  "home",
  "heart",
  "people",
];
const CAT_COSTS = [0, 95, 74, 68, 113, 77];

const WORLD_NAMES = [
  [
    "Göz Teması",
    "Merhaba Demek",
    "Kalabalıkta Yürümek",
    "Soru Sormak",
    "Tanışmak",
    "Konuşma Başlatmak",
    "Grup İçinde Konuşmak",
    "Telefon Açmak",
  ],
  [
    "Toplantıda Söz Almak",
    "Sunum Yapmak",
    "Networking Etkinliği",
    "İş Görüşmesi",
    "Fikir Öne Sürmek",
    "Hayır Demek",
    "Zor Konuşmalar",
    "Liderlik Anı",
  ],
  [
    "Sınıfta El Kaldırmak",
    "Yeni Arkadaş Edinmek",
    "Hocayla Konuşmak",
    "Sınıfta Sunum",
    "Kafeteryada Yanına Oturmak",
    "Grup Çalışması",
    "Okul Etkinliğine Katılmak",
    "Mezuniyet Konuşması",
  ],
  [
    "Markette Soru Sormak",
    "Komşuyla Tanışmak",
    "Parkta Sohbet",
    "Toplu Taşımada Konuşmak",
    "Kafeye Girmek",
    "Etkinliğe Gitmek",
    "Yardım İstemek",
    "Toplulukta Öne Çıkmak",
  ],
  [
    "Göz Teması & Gülümseme",
    "İlk Sözü Söylemek",
    "Numara İstemek",
    "Kahve Teklif Etmek",
    "Duygularını Söylemek",
    "Reddedilmeyle Yüzleşmek",
    "İlişki Sınırları",
    "Gerçek Bağlantı",
  ],
  [
    "Aile Sofrasında Söz Almak",
    "Büyüklerle Konuşmak",
    "Aileye Hayır Demek",
    "Duygularını Paylaşmak",
    "Aile Etkinliğinde Aktif Olmak",
    "Anlaşmazlıkta Konuşmak",
    "Sevgi İfade Etmek",
    "Aile Liderliği",
  ],
];

const WORLD_TOPICS = [
  [
    "👀 Göz Teması",
    "👋 Merhaba Demek",
    "🚶 Kalabalıkta Yürümek",
    "❓ Soru Sormak",
    "🤝 Tanışmak",
    "💬 Konuşma Başlatmak",
    "👥 Grup İçinde Konuşmak",
    "📞 Telefon Açmak",
  ],
  [
    "🗣️ Toplantıda Söz Almak",
    "📊 Sunum Yapmak",
    "🤝 Networking",
    "👔 İş Görüşmesi",
    "💡 Fikir Öne Sürmek",
    "🚫 Hayır Demek",
    "📧 Zor Konuşmalar",
    "🏆 Liderlik Anı",
  ],
  [
    "✋ El Kaldırmak",
    "👫 Yeni Arkadaş",
    "👨‍🏫 Hocayla Konuşmak",
    "🎤 Sunum",
    "🍽️ Kafeterya",
    "📚 Grup Çalışması",
    "🎉 Okul Etkinliği",
    "🎓 Mezuniyet",
  ],
  [
    "🏪 Markette Soru",
    "🏠 Komşuyla Tanışmak",
    "🌳 Parkta Sohbet",
    "🚌 Toplu Taşıma",
    "☕ Kafeye Girmek",
    "🎭 Etkinliğe Gitmek",
    "🤲 Yardım İstemek",
    "🌟 Öne Çıkmak",
  ],
  [
    "😊 Göz Teması",
    "💬 İlk Söz",
    "📱 Numara İstemek",
    "☕ Kahve Teklifi",
    "🌹 Duygularını Söylemek",
    "💔 Reddedilme",
    "🤝 İlişki Sınırları",
    "❤️ Gerçek Bağlantı",
  ],
  [
    "🍽️ Aile Sofrası",
    "👴 Büyüklerle Konuşmak",
    "🚫 Aileye Hayır",
    "💭 Duygularını Paylaşmak",
    "🎉 Aile Etkinliği",
    "🗣️ Anlaşmazlık",
    "🤗 Sevgi İfadesi",
    "🌟 Aile Liderliği",
  ],
];

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
const WORLD_COINS = [5, 8, 8, 10, 12, 12, 15, 30];
const WORLD_OPACITIES = [1, 1, 0.55, 0.42, 0.32, 0.24, 0.17, 0.14];

export default function WorldsScreen() {
  const router = useRouter();
  const [charIdx, setCharIdx] = useState(0);
  const [currentCatIdx, setCurrentCatIdx] = useState(0);
  const [coins, setCoins] = useState(0);

  const [streak, setStreak] = useState(0);
  const [unlockedWorld, setUnlockedWorld] = useState(1);
  const [catUnlockedMap, setCatUnlockedMap] = useState<Record<string, boolean>>(
    {},
  );
  const [completedMap, setCompletedMap] = useState<Record<string, number>>({});
  const [coinClaimedMap, setCoinClaimedMap] = useState<Record<string, boolean>>(
    {},
  );

  const loadData = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);
      const data = Object.fromEntries(pairs) as Record<string, string | null>;

      setCurrentCatIdx(parseInt(data.selectedCategory ?? "0") || 0);
      setCoins(parseInt(data.Coins ?? "0") || 0);
      setStreak(parseInt(data.streak ?? "0") || 0);
      setUnlockedWorld(parseInt(data.unlockedWorld ?? "1") || 1);
      const savedCharIdx = parseInt(data.selectedCharacter ?? "0") || 0;
      setCharIdx(Math.min(savedCharIdx, CHARACTERS.length - 1));

      const catMap: Record<string, boolean> = {};
      const compMap: Record<string, number> = {};
      const claimMap: Record<string, boolean> = {};
      keys.forEach((k) => {
        if (k.startsWith("cat_unlocked_")) catMap[k] = data[k] === "true";
        if (k.startsWith("completedGorevs_"))
          compMap[k] = parseInt(data[k] ?? "0") || 0;
        if (k.startsWith("Coin_claimed_")) claimMap[k] = data[k] === "true";
      });
      setCatUnlockedMap(catMap);
      setCompletedMap(compMap);
      setCoinClaimedMap(claimMap);
    } catch (e) {
      console.warn("Worlds verisi yüklenemedi", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const selectCategory = async (idx: number) => {
    setCurrentCatIdx(idx);
    await AsyncStorage.setItem("selectedCategory", String(idx));
  };

  const isCatUnlocked = (catIdx: number): boolean => {
    if (catIdx === 0) return true;
    return !!catUnlockedMap[`cat_unlocked_${CAT_KEYS[catIdx]}`];
  };

  const unlockCategory = async () => {
    const cost = CAT_COSTS[currentCatIdx];
    if (coins < cost) return;
    const newCoins = coins - cost;
    await AsyncStorage.setItem("Coins", String(newCoins));
    await AsyncStorage.setItem(
      `cat_unlocked_${CAT_KEYS[currentCatIdx]}`,
      "true",
    );
    setCoins(newCoins);
    setCatUnlockedMap((prev) => ({
      ...prev,
      [`cat_unlocked_${CAT_KEYS[currentCatIdx]}`]: true,
    }));
    Alert.alert("🎉", `${CAT_LABELS[currentCatIdx]} açıldı!`);
  };

  const goToLevelMap = (worldNum: number) => {
    router.push({
      pathname: "/level-map",
      params: {
        worldNumber: worldNum,
        worldTopic: WORLD_TOPICS[currentCatIdx][worldNum - 1],
        categoryIdx: currentCatIdx,
        worldCoins: WORLD_COINS[worldNum - 1],
      },
    });
  };

  const catUnlocked = isCatUnlocked(currentCatIdx);
  const cost = CAT_COSTS[currentCatIdx];
  const canAfford = coins >= cost;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>CESARET YOLCULUĞU</Text>
          <Text style={styles.title}>Hangi dünyaya adım atıyorsun?</Text>
        </View>
        <View style={{ alignItems: "center", marginLeft: 12 }}>
          <CharacterAvatar charIdx={charIdx} size={72} />

          <View style={{ flexDirection: "row", marginTop: 5 }}>
            <View style={styles.pillWhite}>
              <Image source={GOLD_COIN} style={styles.pillCoinImg} />
              <Text style={styles.pillText}>{coins}</Text>
            </View>
            <View style={[styles.pillWhite, { marginLeft: 4 }]}>
              <Image source={FLAME_ICON} style={styles.pillFlameImg} />
              <Text style={styles.pillText}>{streak}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* KATEGORİ TABLARI — küçük pill sekmeler */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={styles.tabsRow}
      >
        {CAT_LABELS.map((label, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => selectCategory(i)}
            style={[
              styles.tab,
              i === currentCatIdx ? styles.tabActive : styles.tabInactive,
            ]}
          >
            <Ionicons
              name={CAT_ICONS[i]}
              size={12}
              color={i === currentCatIdx ? "#F5F0E8" : "#1A1A1A"}
              style={{ marginRight: 4 }}
            />
            <Text
              style={
                i === currentCatIdx
                  ? styles.tabTextActive
                  : styles.tabTextInactive
              }
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* KARTLAR */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.cardsContainer}
      >
        {!catUnlocked && (
          <View
            style={[
              styles.lockBanner,
              { backgroundColor: canAfford ? "#E1F5EE" : "#FFF5E6" },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.lockBannerTitleRow}>
                {canAfford && (
                  <Image source={GOLD_COIN} style={styles.lockBannerCoinImg} />
                )}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: canAfford ? "#0F6E56" : "#854F0B",
                  }}
                >
                  {canAfford
                    ? "coinlerinle açabilirsin!"
                    : "🔒 Bu kategori kilitli"}
                </Text>
              </View>
              <View style={styles.lockBannerSubRow}>
                <Text
                  style={{
                    fontSize: 10,
                    color: canAfford ? "#1D9E75" : "#A0522D",
                  }}
                >
                  coin: {coins}
                </Text>
                <Image source={GOLD_COIN} style={styles.lockBannerSubCoin} />
                <Text
                  style={{
                    fontSize: 10,
                    color: canAfford ? "#1D9E75" : "#A0522D",
                  }}
                >
                  · Gerekli: {cost}
                </Text>
                <Image source={GOLD_COIN} style={styles.lockBannerSubCoin} />
              </View>
            </View>
            <TouchableOpacity
              onPress={
                canAfford
                  ? unlockCategory
                  : () => Alert.alert("coin mağazası yakında!")
              }
              style={[
                styles.unlockBtn,
                { backgroundColor: canAfford ? "#0F6E56" : "#C8420A" },
              ]}
            >
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>
                {canAfford ? "Aç →" : "Coin Al"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {Array.from({ length: 8 }).map((_, i) => {
          const worldNum = i + 1;
          const completed =
            completedMap[`completedGorevs_${currentCatIdx}_${worldNum}`] || 0;
          const isDone = completed >= 15;
          const isActive =
            catUnlocked &&
            !isDone &&
            (currentCatIdx === 0 ? worldNum === unlockedWorld : worldNum === 1);
          const worldUnlocked =
            catUnlocked &&
            (currentCatIdx === 0 ? worldNum <= unlockedWorld : worldNum === 1);
          const coinClaimed =
            coinClaimedMap[`Coin_claimed_${currentCatIdx}_${worldNum}`];

          return (
            <TouchableOpacity
              key={worldNum}
              activeOpacity={0.85}
              disabled={!catUnlocked}
              onPress={() => {
                if (worldUnlocked) goToLevelMap(worldNum);
                else if (catUnlocked)
                  Alert.alert(`🔒 Önce Bölüm ${worldNum - 1}'i tamamla!`);
              }}
              style={[
                styles.card,
                {
                  backgroundColor: WORLD_COLORS[i],
                  opacity: isDone
                    ? 0.72
                    : !worldUnlocked
                      ? WORLD_OPACITIES[i]
                      : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.watermark,
                  {
                    color:
                      worldNum === 8
                        ? "rgba(249,224,75,0.06)"
                        : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                {String(worldNum).padStart(2, "0")}
              </Text>

              {(isDone || isActive) && (
                <View style={styles.badge}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: WORLD_COLORS[i],
                    }}
                  >
                    {isDone ? "✓  TAMAMLANDI" : "AKTİF"}
                  </Text>
                </View>
              )}
              {isDone && (
                <View style={styles.doneCheckCircle}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </View>
              )}

              <Text style={styles.worldNo}>
                BÖLÜM {worldNum}
                {worldNum === 8 ? " · FİNAL" : ""}
              </Text>
              <Text
                style={[
                  styles.worldName,
                  worldNum === 8 && { color: "#F9E04B" },
                ]}
              >
                {WORLD_NAMES[currentCatIdx][i]}
              </Text>

              {(isActive || isDone) && (
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${(Math.min(completed, 15) * 100) / 15}%` },
                    ]}
                  />
                </View>
              )}

              <View style={styles.bottomRow}>
                <Text style={styles.statusText}>
                  {isDone
                    ? "15 / 15 görev tamamlandı"
                    : worldUnlocked
                      ? `${completed} / 15 görev`
                      : "15 görev · Kilitli"}
                </Text>
                {(isActive || isDone) && (
                  <View style={styles.devamBtn}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: WORLD_COLORS[i],
                      }}
                    >
                      {isDone ? "Tekrar Gir →" : "Devam →"}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.coinBadge,
                    { opacity: isDone && coinClaimed ? 0.3 : 0.46 },
                  ]}
                >
                  {isDone && coinClaimed ? (
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        color: "#fff",
                      }}
                    >
                      Alındı ✓
                    </Text>
                  ) : (
                    <>
                      <Image source={GOLD_COIN} style={styles.coinBadgeImg} />
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "bold",
                          color: "#fff",
                        }}
                      >
                        +{WORLD_COINS[i]}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = {
  appBg: "#F5F5F0",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#8A8A8A",
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.appBg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 19,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  pillWhite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillCoinImg: { width: 11, height: 11 },
  pillFlameImg: { width: 18, height: 18 },
  pillText: { fontSize: 10, fontWeight: "bold", color: COLORS.textPrimary },

  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "flex-start",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
    height: 28,
  },
  tabActive: { backgroundColor: "#1A1A1A" },
  tabInactive: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EAE0CE",
  },
  tabTextActive: { fontSize: 11, fontWeight: "bold", color: "#F5F0E8" },
  tabTextInactive: { fontSize: 11, fontWeight: "bold", color: "#1A1A1A" },

  cardsContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  lockBannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lockBannerCoinImg: { width: 13, height: 13 },
  lockBannerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 3,
  },
  lockBannerSubCoin: { width: 10, height: 10 },
  unlockBtn: {
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 10,
  },

  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    top: -8,
    right: 8,
    fontSize: 56,
    fontWeight: "bold",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  worldNo: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
  },
  worldName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#fff" },
  bottomRow: { flexDirection: "row", alignItems: "center" },
  statusText: { flex: 1, fontSize: 10, color: "rgba(255,255,255,0.6)" },
  devamBtn: {
    backgroundColor: "#fff",
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  coinBadgeImg: { width: 11, height: 11 },
  doneCheckCircle: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});
