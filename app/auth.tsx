import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

const COLORS = {
  appBg: "#F5F5F0",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#8A8A8A",
  accent: "#1A1A1A",
  danger: "#FF4F4F",
  inputBg: "#F0EEE8",
};

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:
      "863906191672-aah337t7coj4i81lngl1qtmr3uuhot7v.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken =
        response.authentication?.idToken ?? (response.params as any)?.id_token;
      if (idToken) {
        setGoogleLoading(true);
        const credential = GoogleAuthProvider.credential(idToken);
        signInWithCredential(auth, credential)
          .then(() => router.replace("/auth"))
          .catch((e: any) =>
            Alert.alert(
              "Google girişi başarısız",
              e?.message ?? "Bilinmeyen hata",
            ),
          )
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [response]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert("Eksik bilgi", "Lütfen e-posta ve şifreni gir.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Şifre çok kısa", "Şifre en az 6 karakter olmalı.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } else {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      }
      router.replace("/auth");
    } catch (e: any) {
      Alert.alert("Bir sorun oluştu", translateFirebaseError(e?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={{ fontSize: 32 }}>🌱</Text>
            </View>
            <Text style={styles.appName}>Cesaret Koçu</Text>
            <Text style={styles.appTagline}>Bugün bir adım at</Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                mode === "login" && styles.toggleBtnActive,
              ]}
              onPress={() => setMode("login")}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === "login" && styles.toggleTextActive,
                ]}
              >
                Giriş Yap
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                mode === "signup" && styles.toggleBtnActive,
              ]}
              onPress={() => setMode("signup")}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === "signup" && styles.toggleTextActive,
                ]}
              >
                Kayıt Ol
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              placeholder="ornek@eposta.com"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              placeholder="En az 6 karakter"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {mode === "login" && (
              <TouchableOpacity style={{ alignSelf: "flex-end", marginTop: 8 }}>
                <Text style={styles.forgotText}>Şifremi unuttum</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            disabled={!request || googleLoading}
            onPress={() => promptAsync()}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.googleBtnText}>🔵 Google ile devam et</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.switchHint}>
            {mode === "login" ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
            <Text
              style={styles.switchLink}
              onPress={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Kayıt ol" : "Giriş yap"}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function translateFirebaseError(code?: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Geçersiz e-posta adresi.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-posta veya şifre hatalı.";
    case "auth/email-already-in-use":
      return "Bu e-posta zaten kayıtlı. Giriş yapmayı dener misin?";
    case "auth/weak-password":
      return "Şifre çok zayıf, en az 6 karakter olmalı.";
    case "auth/network-request-failed":
      return "İnternet bağlantını kontrol et.";
    default:
      return "Bir şeyler ters gitti, tekrar dener misin?";
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.appBg },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },

  logoWrap: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.cardBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  appName: { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
  appTagline: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#EEEAE2",
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: COLORS.cardBg },
  toggleText: { fontSize: 13, fontWeight: "bold", color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.textPrimary },

  form: { marginBottom: 8 },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  forgotText: { fontSize: 12, fontWeight: "bold", color: COLORS.textSecondary },

  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "bold" },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5DCC8" },
  dividerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 12,
  },

  googleBtn: {
    borderWidth: 1,
    borderColor: "#DDD5C7",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },

  switchHint: {
    textAlign: "center",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 20,
  },
  switchLink: { color: COLORS.textPrimary, fontWeight: "bold" },
});
