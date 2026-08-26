import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import CharacterAvatar from "../../components/CharacterAvatar";

import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import type { ComponentProps } from "react";
import React, { useCallback, useState } from "react";
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
import { CHARACTERS } from "../../characters";
import { auth } from "../../firebaseConfig"; // (tabs) klasöründen 2 üst dizine çıkıyor
import { useTheme } from "../../ThemeContext";

const GOLD_COIN = require("../../assets/images/gold_coin.png"); // (tabs) klasöründen 2 üst dizine çıkıyor

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const COLORS = {
  appBg: "#F5F5F0",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#B0A898",
  danger: "#E8633A",
  pastelGreen: "#E6F4EA",
  accent: "#C8420A",
};

const SECTION_COLORS = {
  blue: { fg: "#5B9DBF", bg: "#E8F2F8" },
  purple: { fg: "#8B6FD4", bg: "#F0ECFB" },
  yellow: { fg: "#D4A843", bg: "#FBF5E6" },
  pink: { fg: "#D45B8A", bg: "#FBECF4" },
  red: { fg: "#E8633A", bg: "#FDF0EB" },
  green: { fg: "#3BAD7A", bg: "#EBF8F2" },
};

export default function SettingsScreen() {
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState("Kahraman");
  const [charIdx, setCharIdx] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [language, setLanguage] = useState("TR");
  const [email, setEmail] = useState("—");

  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const loadData = useCallback(async () => {
    try {
      const keys = [
        "playerName",
        "playerLevel",
        "playerXP",
        "language",
        "Coins",
      ];
      const pairs = await AsyncStorage.multiGet(keys);
      const data = Object.fromEntries(pairs) as Record<string, string | null>;

      setName(data.playerName ?? "Kahraman");
      setLevel(parseInt(data.playerLevel ?? "1") || 1);
      setXp(parseInt(data.playerXP ?? "0") || 0);
      setCoins(parseInt(data.Coins ?? "0") || 0);
      setLanguage(data.language ?? "TR");
      const savedCharIdx =
        parseInt((await AsyncStorage.getItem("selectedCharacter")) ?? "0") || 0;
      setCharIdx(Math.min(savedCharIdx, CHARACTERS.length - 1));
    } catch (e) {
      console.warn("Ayarlar yüklenemedi", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const unsub = onAuthStateChanged(auth, (user) => {
        setEmail(user?.email || "—");
      });
      return unsub;
    }, [loadData]),
  );

  const handlePasswordReset = () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    const userEmail = user.email;
    Alert.alert(
      "Şifre Değiştir",
      `${userEmail} adresine şifre sıfırlama maili gönderilsin mi?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Gönder",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, userEmail);
              Alert.alert("Mail gönderildi ✓");
            } catch (e: any) {
              Alert.alert("Hata", e?.message ?? "Bilinmeyen bir hata oluştu.");
            }
          },
        },
      ],
    );
  };

  const openNameModal = () => {
    setNameInput(name);
    setNameModalVisible(true);
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem("playerName", trimmed);
    setName(trimmed);
    setNameModalVisible(false);
  };

  const setLang = async (lang: string) => {
    await AsyncStorage.setItem("language", lang);
    setLanguage(lang);
  };

  const handleReset = () => {
    Alert.alert(
      "⚠️ Emin misin?",
      "Tüm ilerleme, XP ve seri kaydı silinecek. Bu işlem geri alınamaz.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sıfırla",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert("Tüm veriler sıfırlandı.");
            router.replace("/auth");
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Hesabından çıkış yapmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/auth");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* BAŞLIK */}
        <View style={styles.header}>
          <Text style={styles.title}>Ayarlar</Text>
        </View>

        {/* PROFİL — sade satır */}
        <View style={styles.profileRow}>
          <CharacterAvatar charIdx={charIdx} size={72} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.profileNameSmall}>{name}</Text>
            <View style={styles.profileMetaRow}>
              <Text style={styles.profileMeta}>
                Seviye {level} · {xp} XP · {coins}
              </Text>
              <Image source={GOLD_COIN} style={styles.profileMetaCoin} />
            </View>
          </View>
          <TouchableOpacity onPress={openNameModal}>
            <Ionicons
              name="create-outline"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* HESAP */}
        <SectionLabel text="HESAP" />
        <SettingItem
          icon="mail"
          colorKey="blue"
          title="E-posta"
          subtitle={email}
        />
        <SettingItem
          icon="lock-closed"
          colorKey="blue"
          title="Şifre Değiştir"
          subtitle="Sıfırlama maili gönderilir"
          onPress={handlePasswordReset}
          chevron
        />

        {/* KİŞİSELLEŞTİRME */}
        <SectionLabel text="KİŞİSELLEŞTİRME" />
        <SettingItem
          icon="person-circle"
          colorKey="purple"
          title="Karakter"
          subtitle="Avatar seç"
          onPress={() => router.push("/character-select")}
          chevron
        />
        <SettingItem
          icon={isDark ? "moon" : "sunny"}
          colorKey="purple"
          title="Tema"
          subtitle={isDark ? "Koyu mod" : "Açık mod"}
          onPress={toggleTheme}
          chevron
        />

        {/* UYGULAMA */}
        <SectionLabel text="UYGULAMA" />
        <View style={[styles.settingItem]}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: SECTION_COLORS.yellow.bg },
            ]}
          >
            <Ionicons name="earth" size={18} color={SECTION_COLORS.yellow.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>Dil</Text>
            <Text style={styles.itemSubtitle}>{language}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <LangPill
              label="TR"
              active={language === "TR"}
              onPress={() => setLang("TR")}
            />
            <LangPill
              label="EN"
              active={language === "EN"}
              onPress={() => setLang("EN")}
            />
          </View>
        </View>
        <SettingItem
          icon="information-circle"
          colorKey="yellow"
          title="Uygulama Hakkında"
          subtitle="v1.0.0"
          onPress={() =>
            Alert.alert(
              "Cesaret Koçu",
              "Versiyon 1.0.0\n\nSosyal cesaretini geliştirmek için tasarlandı.\n\n© 2026 Cesaret Koçu",
            )
          }
          chevron
        />

        {/* TEHLİKELİ BÖLGE */}
        <SectionLabel text="TEHLİKELİ BÖLGE" />
        <SettingItem
          icon="trash"
          colorKey="red"
          title="Veriyi Sıfırla"
          subtitle="Geri alınamaz"
          onPress={handleReset}
          danger
          chevron
        />
        <SettingItem
          icon="log-out"
          colorKey="red"
          title="Çıkış Yap"
          subtitle="Hesabından çıkış yap"
          onPress={handleLogout}
          danger
          chevron
        />
      </ScrollView>

      {/* İsim değiştirme modalı */}
      <Modal visible={nameModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Görünen İsim</Text>
            <TextInput
              style={styles.input}
              placeholder="Görünen ismin..."
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setNameModalVisible(false)}
                style={{ marginRight: 20 }}
              >
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName}>
                <Text style={styles.confirmText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Alt bileşenler ─────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

type ColorKey = keyof typeof SECTION_COLORS;
type SettingItemProps = {
  icon: IoniconName;
  colorKey: ColorKey;
  title: string;
  subtitle: string;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
};

function SettingItem({
  icon,
  colorKey,
  title,
  subtitle,
  onPress,
  chevron,
  danger,
}: SettingItemProps) {
  const palette = SECTION_COLORS[colorKey];
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.iconBox,
          { backgroundColor: danger ? "#FDF0EB" : palette.bg },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={danger ? COLORS.danger : palette.fg}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemTitle, danger && { color: COLORS.danger }]}>
          {title}
        </Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      {chevron && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={danger ? COLORS.danger : COLORS.textSecondary}
        />
      )}
    </Wrapper>
  );
}

type LangPillProps = { label: string; active: boolean; onPress: () => void };
function LangPill({ label, active, onPress }: LangPillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.langPill,
        active ? styles.langPillActive : styles.langPillInactive,
      ]}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "bold",
          color: active ? "#fff" : "#888",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Stiller ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.appBg },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 30, fontWeight: "bold", color: COLORS.textPrimary },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  avatarCircleSmall: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  profileNameSmall: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  profileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  profileMeta: { fontSize: 11, color: COLORS.textSecondary },
  profileMetaCoin: { width: 11, height: 11 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
    marginLeft: 20,
    marginTop: 16,
    marginBottom: 8,
  },

  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemTitle: { fontSize: 14, fontWeight: "bold", color: COLORS.textPrimary },
  itemSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 6,
  },
  langPillActive: { backgroundColor: "#1A1A1A" },
  langPillInactive: { backgroundColor: "#EEEEEE" },

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
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: "bold" },
  confirmText: { color: COLORS.accent, fontWeight: "bold" },
});
