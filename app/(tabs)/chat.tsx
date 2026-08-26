import { CHARACTERS } from "../../characters";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import { getFeelingCount, incrementFeelingCount } from "../../communityStats";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  appBg: "#F5F5F0",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#8A8A8A",
  accent: "#A0522D",
};

// 6 negatif duygu (önceden 4 idi): Korkuyorum ve Karışığım eklendi
const NEGATIVE_FEELINGS = [
  "Kaygılıyım",
  "Üzgünüm",
  "Sinirliyim",
  "Yorgunum",
  "Korkuyorum",
  "Karışığım",
];

// Duyguların cümle içinde kullanılacak sıfat hali (mesaj şablonları için)
const FEELING_LOWER: Record<string, string> = {
  Kaygılıyım: "kaygılı",
  Üzgünüm: "üzgün",
  Sinirliyim: "sinirli",
  Yorgunum: "yorgun",
  Korkuyorum: "korkulu",
  Karışığım: "karışık",
};

// Alanlar 6 -> 8'e çıkarıldı (Sağlık, Finans eklendi).
// NOT: Sağlık ve Finans için /worlds ekranında henüz özel bir kategori
// olmadığından şimdilik Genel (0) kategorisine yönlendiriliyor.
// Gerçek kategori index'leri belli olduğunda burada güncelle.
const AREA_TO_CATEGORY: Record<string, number> = {
  İş: 1,
  Okul: 2,
  Aile: 5,
  Arkadaşlar: 0,
  Romantik: 4,
  Genel: 0,
  Sağlık: 0, // TODO: gerçek kategori index'i ile değiştir
  Finans: 0, // TODO: gerçek kategori index'i ile değiştir
};

// "Şu an ne yapmak istersin?" adımı — 5 -> 11 seçeneğe çıkarıldı.
// Her seçenek hem buton etiketini hem de eşleşen key'i taşır.
const WANTS_OPTIONS: { label: string; key: string }[] = [
  { label: "Konuşmak / dinlenmek", key: "talk" },
  { label: "Bir görevle dikkatimi dağıtmak", key: "task" },
  { label: "Sadece nefes almak", key: "breathe" },
  { label: "Kısa bir yürüyüşe çıkmak", key: "move" },
  { label: "Müzik dinlemek", key: "music" },
  { label: "Yazarak içimi dökmek", key: "journal" },
  { label: "Sevdiğim biriyle konuşmak", key: "call" },
  { label: "Bir şeyler karalamak / çizmek", key: "draw" },
  { label: "Kısa bir şey izlemek", key: "watch" },
  { label: "Minnettar olduğum şeyleri düşünmek", key: "gratitude" },
  { label: "Bulunduğum ortamı toparlamak", key: "tidy" },
];

// Her "wants" seçeneği için: sonuç ekranında gösterilecek öneri metni
// (resultText) ve farkındalık mesajına eklenecek kısa aksiyon cümlesi
// (awarenessAction). "task" ve "talk" özel olarak ayrıca ele alınıyor.
const WANTS_INFO: Record<
  string,
  { resultText?: string; awarenessAction: string }
> = {
  talk: {
    resultText:
      "Bunu benimle paylaştığın için teşekkürler. Buradayım, seninle.",
    awarenessAction: "Bunu paylaşmayı seçmen bile başlı başına güçlü bir adım.",
  },
  task: {
    awarenessAction: "", // area ile birlikte ayrı işleniyor
  },
  breathe: {
    resultText:
      "4 saniye al, 4 saniye tut, 6 saniye ver. İstersen birlikte yapalım.",
    awarenessAction: "Bir an durup nefesine odaklanmayı seçtin.",
  },
  move: {
    resultText:
      "Kısa bir yürüyüş zihnini toparlamana yardımcı olabilir. Birkaç dakika dışarı çıkmayı dene.",
    awarenessAction: "Kısa bir yürüyüşle zihnini toparlamaya karar verdin.",
  },
  music: {
    resultText:
      "Sevdiğin bir şarkıyı açıp birkaç dakika sadece dinlemeye ne dersin?",
    awarenessAction: "Müzik dinleyerek kendine bir an ayırmayı seçtin.",
  },
  journal: {
    resultText:
      "Aklından geçenleri birkaç cümleyle yazmak, zihnini boşaltmana yardımcı olabilir.",
    awarenessAction: "Yazarak içini dökmeyi seçtin.",
  },
  call: {
    resultText:
      "Güvendiğin biriyle birkaç dakika konuşmak yükünü hafifletebilir. İstersen şimdi mesaj atabilirsin.",
    awarenessAction: "Güvendiğin biriyle bağ kurmayı seçtin.",
  },
  draw: {
    resultText:
      "Elindeki bir kağıda hiç düşünmeden karalamalar yapmak rahatlatıcı olabilir.",
    awarenessAction: "Karalayarak zihnini boşaltmayı seçtin.",
  },
  watch: {
    resultText:
      "Sevdiğin kısa bir video ya da bölüm izlemek zihnini biraz dinlendirebilir.",
    awarenessAction: "Kısa bir şey izleyerek dinlenmeyi seçtin.",
  },
  gratitude: {
    resultText:
      "Şu an minnettar olduğun üç şeyi aklından geçirmek bakış açını değiştirebilir.",
    awarenessAction: "Minnettarlığa odaklanmayı seçtin.",
  },
  tidy: {
    resultText:
      "Bulunduğun ortamı birkaç dakika toparlamak, zihnini de toparlayabilir.",
    awarenessAction: "Ortamını toparlayarak kendine iyi bakmayı seçtin.",
  },
};

// Her duygu için düşünce seçenekleri 4 -> 6'ya çıkarıldı
const THOUGHT1: Record<string, string[]> = {
  Kaygılıyım: [
    "Beni yargılayacaklar",
    "Ne söyleyeceğimi bilemiyorum",
    "Yanlış bir şey söylemekten korkuyorum",
    "Dışlanacağımı düşünüyorum",
    "Bir şeyi unutmuş olabilirim",
    "Hazırlıksız yakalanacağımı düşünüyorum",
  ],
  Üzgünüm: [
    "Kendimi yalnız hissediyorum",
    "Bir şeyi kaybettiğimi hissediyorum",
    "Yeterince iyi olmadığımı düşünüyorum",
    "Nedenini tam bilmiyorum",
    "İçimde bir boşluk var",
    "Anlaşılmadığımı hissediyorum",
  ],
  Sinirliyim: [
    "Adil olmayan bir şey oldu",
    "Beni dinlemediklerini hissediyorum",
    "Kontrolü kaybettiğimi hissediyorum",
    "Aslında ne olduğunu tam bilmiyorum",
    "Saygı görmediğimi hissediyorum",
    "Bir sözü tutulmadı",
  ],
  Yorgunum: [
    "Çok fazla şeyle uğraşıyorum",
    "Kendime hiç zaman ayıramıyorum",
    "Duygusal olarak tükendiğimi hissediyorum",
    "Aslında sebebini bilmiyorum",
    "Uykum düzenli değil",
    "Sürekli tetikte hissediyorum",
  ],
  Korkuyorum: [
    "Bir şey ters gidecek gibi hissediyorum",
    "Kontrolümü kaybedeceğimi düşünüyorum",
    "Kötü bir şey olacakmış gibi geliyor",
    "Güvende olmadığımı hissediyorum",
    "Geçmişte yaşadığım bir şeyi hatırlatıyor",
    "Aslında neden korktuğumu bilmiyorum",
  ],
  Karışığım: [
    "Ne hissettiğimi tam bilmiyorum",
    "Birden fazla duygu aynı anda var",
    "Kararsız hissediyorum",
    "Düşüncelerim birbirine karışıyor",
    "Ne istediğimi netleştiremiyorum",
    "Aslında sebebini bilmiyorum",
  ],
};

const THOUGHT2: Record<string, string[]> = {
  Kaygılıyım: [
    "Daha önce böyle bir şey oldu",
    "Kendimi yetersiz hissediyorum",
    "İnsanların ne düşündüğünü çok önemsiyorum",
    "Aslında belirli bir sebep yok",
    "Mükemmel olmam gerektiğini düşünüyorum",
    "Geçmişte benzer bir şey yaşadım",
  ],
  Üzgünüm: [
    "Son zamanlarda böyle bir şey yaşandı",
    "Uzun zamandır böyle hissediyorum",
    "Biri beni hayal kırıklığına uğrattı",
    "Aslında belirli bir sebep yok",
    "Beklentilerim karşılanmadı",
    "Değişen bir şeye alışmaya çalışıyorum",
  ],
  Sinirliyim: [
    "Sınırlarım aşıldı",
    "Aynı şey tekrar tekrar oluyor",
    "Kendimi ifade edemediğimi hissediyorum",
    "Aslında belirli bir sebep yok",
    "Kendimi savunmam gerektiğini hissediyorum",
    "Uzun süredir biriktirdiğim bir şey var",
  ],
  Yorgunum: [
    "Uzun zamandır dinlenmedim",
    "Başkalarının beklentilerini karşılamaya çalışıyorum",
    "Kendimden çok şey istiyorum",
    "Aslında belirli bir sebep yok",
    "Kendime öncelik vermiyorum",
    "Çok fazla sorumluluk üstlendim",
  ],
  Korkuyorum: [
    "Daha önce kötü bir deneyim yaşadım",
    "Kontrolü elimde tutmak istiyorum",
    "Belirsizlikle başa çıkmakta zorlanıyorum",
    "Kendimi güvende hissetmiyorum",
    "Bu bana tanıdık bir his",
    "Aslında belirli bir sebep yok",
  ],
  Karışığım: [
    "Çok fazla şey aynı anda oluyor",
    "Önemli bir karar vermem gerekiyor",
    "Farklı beklentiler arasında sıkıştım",
    "Kendimle çelişiyorum",
    "Zaman baskısı hissediyorum",
    "Aslında belirli bir sebep yok",
  ],
};

// İyi hissetme sebepleri 4 -> 6'ya çıkarıldı
const GOOD_REASON_MESSAGES: Record<string, string> = {
  "Bir başarı":
    "Bunu hak ettin! Küçük ya da büyük, her başarı kutlanmaya değer. 🎉",
  "Biriyle güzel vakit geçirdim":
    "Bağlantı kurmak tam da bu uygulamanın amacı — harika gidiyorsun! 💛",
  "Kendimi güçlü hissediyorum":
    "Bu hissi hatırla — zor günlerde sana geri dönecek bir kaynak bu. 💪",
  "Sebepsiz, sadece iyiyim":
    "Bazen sebepsiz iyi hissetmek en güzelidir. Bu anın tadını çıkar. ✨",
  "Doğada vakit geçirdim":
    "Doğayla bağlantı kurmak zihnini dinlendirir. Bu anın farkında olman güzel. 🌿",
  "Kendime iyi baktım":
    "Kendine zaman ayırman, kendine verdiğin en güzel hediyelerden biri. 💛",
};

type Answers = {
  feeling?: string;
  thought1?: string;
  thought2?: string;
  wants?: string;
  area?: string;
  goodReason?: string;
  goodWants?: string;
};

type Step =
  | "feeling"
  | "thought1"
  | "thought2"
  | "wants"
  | "area"
  | "goodReason"
  | "goodWants"
  | "result";

// ---- Farkındalık mesajı üretimi -------------------------------------
// Kombinasyon sayısı çok fazla olduğu için (duygu x düşünce x düşünce x
// istek x alan) her ihtimali tek tek yazmak yerine, cevaplardan alınan
// parçaları bir şablon içinde birleştiriyoruz. Bu sayede yeni bir seçenek
// eklendiğinde de mesaj otomatik olarak doğru şekilde oluşuyor.

function getNegativeAwarenessMessage(answers: Answers): string {
  const feelingWord = answers.feeling
    ? (FEELING_LOWER[answers.feeling] ?? answers.feeling.toLowerCase())
    : "";

  // Düşünce cümleleri gramer olarak birbirinden çok farklı olabiliyor
  // ("Sınırlarım aşıldı" tam cümle, "Beni yargılayacaklar" farklı bir
  // çekimde). Bunları tek bir cümlenin içine sokup ek eklemek yerine,
  // etiketli ayrı satırlar halinde sunuyoruz — böylece hangi cümle gelirse
  // gelsin doğru okunuyor.
  let msg = `Bugün kendini ${feelingWord} hissettin.\n\n`;
  msg += `💭 Aklından geçen: "${answers.thought1}"\n`;
  msg += `🔍 Altında yatabilecek neden: "${answers.thought2}"\n\n`;

  if (answers.wants === "task") {
    msg += `Şimdi ${
      answers.area ?? "kendine ayırdığın"
    } alanında küçük bir adım atmaya karar verdin.`;
  } else if (answers.wants && WANTS_INFO[answers.wants]) {
    msg += WANTS_INFO[answers.wants].awarenessAction;
  }

  msg += "\n\nHissettiklerini fark etmek, onlarla baş etmenin ilk adımıdır. 🌱";
  return msg;
}

function getGoodAwarenessMessage(answers: Answers): string {
  const base = answers.goodReason
    ? GOOD_REASON_MESSAGES[answers.goodReason]
    : "Bugün kendini iyi hissediyorsun.";

  let msg = base;

  if (answers.goodWants?.startsWith("Bir görev")) {
    msg += " Bu güzel enerjiyi küçük bir adıma dönüştürmeye karar verdin.";
  } else if (answers.goodWants?.startsWith("Bunu not")) {
    msg += " Bu anı hatırlamak istemen, kendine iyi bakmanın güzel bir yolu.";
  } else if (answers.goodWants === "Sadece tadını çıkarmak") {
    msg += " Bu anın tadını çıkarmayı seçmen de kıymetli.";
  } else if (answers.goodWants?.startsWith("Bunu birine")) {
    msg += " Bu güzel anı biriyle paylaşmak, bağını daha da güçlendirebilir.";
  } else if (answers.goodWants?.startsWith("Küçük bir mola")) {
    msg += " Kendine bir mola vermeyi seçmen de değerli bir karar.";
  }

  return msg;
}

function getAwarenessMessage(answers: Answers): string {
  return answers.feeling === "İyiyim"
    ? getGoodAwarenessMessage(answers)
    : getNegativeAwarenessMessage(answers);
}
// -----------------------------------------------------------------------

export default function ChatScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("feeling");
  const [answers, setAnswers] = useState<Answers>({});
  const [charIdx, setCharIdx] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const idx =
          parseInt((await AsyncStorage.getItem("selectedCharacter")) ?? "0") ||
          0;
        setCharIdx(Math.min(idx, CHARACTERS.length - 1));
      })();
    }, []),
  );

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [step]);

  const restart = () => {
    setAnswers({});
    setStep("feeling");
  };

  const answer = (key: keyof Answers, value: string) => {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);

    if (key === "feeling") {
      setStep(value === "İyiyim" ? "goodReason" : "thought1");
    } else if (key === "thought1") setStep("thought2");
    else if (key === "thought2") setStep("wants");
    else if (key === "wants") {
      setStep(value === "task" ? "area" : "result");
    } else if (key === "area") setStep("result");
    else if (key === "goodReason") setStep("goodWants");
    else if (key === "goodWants") setStep("result");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <LottieView
            source={CHARACTERS[charIdx].file}
            progress={0}
            autoPlay={false}
            loop={false}
            style={{ width: 60, height: 60 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>Rehber Simit</Text>
          <Text style={styles.headerSub}>Seni dinliyor</Text>
        </View>
        {step !== "feeling" && (
          <TouchableOpacity onPress={restart}>
            <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === "feeling" && (
          <QuestionBlock
            title="Şu an ne hissediyorsun?"
            options={[...NEGATIVE_FEELINGS, "İyiyim"]}
            onSelect={(v) => answer("feeling", v)}
          />
        )}

        {step === "thought1" && answers.feeling && (
          <QuestionBlock
            title="Şu an aklından ne geçiyor?"
            options={THOUGHT1[answers.feeling]}
            onSelect={(v) => answer("thought1", v)}
          />
        )}

        {step === "thought2" && answers.feeling && (
          <QuestionBlock
            title={`Peki "${answers.thought1}" düşüncesini tetikleyen ne olabilir?`}
            options={THOUGHT2[answers.feeling]}
            onSelect={(v) => answer("thought2", v)}
          />
        )}

        {step === "wants" && (
          <QuestionBlock
            title="Şu an ne yapmak istersin?"
            options={WANTS_OPTIONS.map((o) => o.label)}
            onSelect={(v) => {
              const found = WANTS_OPTIONS.find((o) => o.label === v);
              answer("wants", found?.key ?? "talk");
            }}
          />
        )}

        {step === "area" && (
          <QuestionBlock
            title="Hangi alanda bir görev bakalım?"
            options={[
              "İş",
              "Okul",
              "Aile",
              "Arkadaşlar",
              "Romantik",
              "Genel",
              "Sağlık",
              "Finans",
            ]}
            onSelect={(v) => answer("area", v)}
          />
        )}

        {step === "goodReason" && (
          <QuestionBlock
            title="Ne güzel! Bunun sebebi ne?"
            options={[
              "Bir başarı",
              "Biriyle güzel vakit geçirdim",
              "Kendimi güçlü hissediyorum",
              "Sebepsiz, sadece iyiyim",
              "Doğada vakit geçirdim",
              "Kendime iyi baktım",
            ]}
            onSelect={(v) => answer("goodReason", v)}
          />
        )}

        {step === "goodWants" && (
          <QuestionBlock
            title="Bu anı ne yapmak istersin?"
            options={[
              "Bir görev tamamlayıp ilerlememi sürdürmek",
              "Bunu not alıp hatırlamak",
              "Sadece tadını çıkarmak",
              "Bunu birine anlatmak",
              "Küçük bir mola vermek",
            ]}
            onSelect={(v) => answer("goodWants", v)}
          />
        )}

        {step === "result" && (
          <ResultBlock answers={answers} onRestart={restart} router={router} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type QuestionBlockProps = {
  title: string;
  options: string[];
  onSelect: (v: string) => void;
};
function QuestionBlock({ title, options, onSelect }: QuestionBlockProps) {
  return (
    <View>
      <Text style={styles.questionTitle}>{title}</Text>
      <View style={{ marginTop: 20 }}>
        {options.map((opt) => (
          <AnimatedOption key={opt} label={opt} onPress={() => onSelect(opt)} />
        ))}
      </View>
    </View>
  );
}

type AnimatedOptionProps = { label: string; onPress: () => void };
function AnimatedOption({ label, onPress }: AnimatedOptionProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.optionBtn}
        activeOpacity={0.85}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
      >
        <Text style={styles.optionText}>{label}</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

type ResultBlockProps = {
  answers: Answers;
  onRestart: () => void;
  router: ReturnType<typeof useRouter>;
};
function ResultBlock({ answers, onRestart, router }: ResultBlockProps) {
  const isGood = answers.feeling === "İyiyim";
  const awarenessMessage = getAwarenessMessage(answers);

  const [communityCount, setCommunityCount] = useState<number | null>(null);

  useEffect(() => {
    if (!answers.feeling) return;
    (async () => {
      try {
        await incrementFeelingCount(answers.feeling!);
        const count = await getFeelingCount(answers.feeling!);
        setCommunityCount(count);
      } catch (e) {
        console.warn("Community stat şu an kullanılamıyor", e);
      }
    })();
  }, [answers.feeling]);

  const CommunityLine = () =>
    communityCount !== null && communityCount > 1 ? (
      <Text style={styles.communityText}>
        Bu hafta {communityCount} kişi daha &quot;{answers.feeling}&quot;
        hissetti. Yalnız değilsin. 🤍 değilsin. 🤍
      </Text>
    ) : null;

  if (isGood) {
    const wantsTask = answers.goodWants?.startsWith("Bir görev");

    return (
      <View>
        <View style={styles.resultIconWrap}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
        </View>

        <CommunityLine />

        {wantsTask && (
          <TouchableOpacity
            style={styles.taskBtn}
            onPress={() => router.push("/worlds")}
          >
            <Text style={styles.taskBtnText}>Devam edelim mi? →</Text>
          </TouchableOpacity>
        )}

        <AwarenessCard message={awarenessMessage} />

        <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
          <Text style={styles.restartBtnText}>Baştan başla</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showTaskButton = answers.wants === "task" && answers.area;
  const categoryIdx = answers.area ? AREA_TO_CATEGORY[answers.area] : 0;

  return (
    <View>
      <View style={styles.resultIconWrap}>
        <Text style={{ fontSize: 40 }}>🍩</Text>
      </View>

      <CommunityLine />

      {answers.wants === "talk" && (
        <Text style={styles.resultMessage}>{WANTS_INFO.talk.resultText}</Text>
      )}

      {answers.wants &&
        answers.wants !== "talk" &&
        answers.wants !== "task" &&
        WANTS_INFO[answers.wants]?.resultText && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {WANTS_INFO[answers.wants].resultText}
            </Text>
          </View>
        )}

      {showTaskButton && (
        <TouchableOpacity
          style={styles.taskBtn}
          onPress={() =>
            router.push({
              pathname: "/worlds",
              params: { preselectCategory: String(categoryIdx) },
            })
          }
        >
          <Text style={styles.taskBtnText}>
            {answers.area} kategorisine bakalım mı? →
          </Text>
        </TouchableOpacity>
      )}

      <AwarenessCard message={awarenessMessage} />

      <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
        <Text style={styles.restartBtnText}>Baştan başla</Text>
      </TouchableOpacity>
    </View>
  );
}

// Sohbetin en sonunda görünen, cevaplara göre otomatik oluşturulan
// farkındalık mesajı kartı.
type AwarenessCardProps = { message: string };
function AwarenessCard({ message }: AwarenessCardProps) {
  return (
    <View style={styles.awarenessCard}>
      <View style={styles.awarenessHeaderRow}>
        <Text style={{ fontSize: 16 }}>💡</Text>
        <Text style={styles.awarenessLabel}>Farkındalık</Text>
      </View>
      <Text style={styles.awarenessText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.appBg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F5C842",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerName: { fontSize: 15, fontWeight: "bold", color: COLORS.textPrimary },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  questionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    lineHeight: 28,
  },

  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
  },
  optionText: { fontSize: 15, color: COLORS.textPrimary, fontWeight: "500" },

  resultIconWrap: { alignItems: "center", marginBottom: 16 },
  resultMessage: {
    fontSize: 17,
    color: COLORS.textPrimary,
    lineHeight: 26,
    textAlign: "center",
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  summaryText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21 },

  awarenessCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  awarenessHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  awarenessLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  awarenessText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  communityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
  },

  taskBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  taskBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },

  restartBtn: { alignItems: "center", paddingVertical: 14 },
  restartBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "bold",
  },
});
