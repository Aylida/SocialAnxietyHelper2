import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CHARACTERS, type CharacterDef } from "../characters";

const COLORS = {
  appBg: "#F5F5F0",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#8A8A8A",
  accent: "#D9A574",
};

const PREVIEW_DURATION = 1050;

export default function CharacterSelectScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const loadSelected = useCallback(async () => {
    const idx =
      parseInt((await AsyncStorage.getItem("selectedCharacter")) ?? "0") || 0;
    setSelected(Math.min(idx, CHARACTERS.length - 1));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSelected();
    }, [loadSelected]),
  );

  const choose = async (idx: number, char: CharacterDef) => {
    setSelected(idx);
    await AsyncStorage.setItem("selectedCharacter", String(idx));

    setPlayingId(char.id);
    setTimeout(
      () => setPlayingId((cur) => (cur === char.id ? null : cur)),
      PREVIEW_DURATION,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Karakterini Seç</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subtitle}>
        Rehber Simit&apos;te bu karakter seninle yürüyecek
      </Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {CHARACTERS.map((char: CharacterDef, idx: number) => (
          <CharacterCard
            key={char.id}
            char={char}
            isSelected={idx === selected}
            isPlaying={playingId === char.id}
            onPress={() => choose(idx, char)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

type CharacterCardProps = {
  char: CharacterDef;
  isSelected: boolean;
  isPlaying: boolean;
  onPress: () => void;
};

function CharacterCard({
  char,
  isSelected,
  isPlaying,
  onPress,
}: CharacterCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isPlaying ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
      tension: 60,
    }).start();
  }, [isPlaying, scale]);

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {isPlaying ? (
          <LottieView
            key={`${char.id}-play`}
            source={char.file}
            autoPlay
            loop
            style={styles.lottie}
          />
        ) : (
          <LottieView
            key={`${char.id}-frozen`}
            source={char.file}
            progress={0}
            autoPlay={false}
            loop={false}
            style={styles.lottie}
          />
        )}
      </Animated.View>

      <Text style={[styles.charName, isSelected && styles.charNameSelected]}>
        {char.name}
      </Text>

      {isSelected && (
        <View style={styles.selectedPill}>
          <Ionicons name="checkmark" size={12} color="#fff" />
          <Text style={styles.selectedPillText}>Seçildi</Text>
        </View>
      )}
    </TouchableOpacity>
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

  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    paddingBottom: 30,
  },
  card: {
    width: "30%",
    aspectRatio: 0.85,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: COLORS.accent, backgroundColor: "#FBF3E8" },
  lottie: { width: 62, height: 62 },
  charName: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  charNameSelected: { color: COLORS.textPrimary },

  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  selectedPillText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});
