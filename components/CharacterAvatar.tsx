import React from "react";
import {
  GestureResponderEvent,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { CHARACTERS } from "../characters"; // yol, dosyanı nereye koyduğuna göre değişebilir

type CharacterAvatarProps = {
  charIdx: number;
  size: number;
  onPress?: (event: GestureResponderEvent) => void;
};

/**
 * Seçilen karakterin dairesini (kendi arka plan rengi + fotoğrafı) gösterir.
 * Home, Worlds, Settings'teki tekrar eden "daire + Image" deseninin ortak hali.
 * Fotoğraf her zaman dairenin %75'i büyüklüğünde ortalanır.
 */
export default function CharacterAvatar({
  charIdx,
  size,
  onPress,
}: CharacterAvatarProps) {
  const character = CHARACTERS[Math.min(charIdx, CHARACTERS.length - 1)];
  const photoSize = size * 0.95;

  const circle = (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: character.bgColor,
        },
      ]}
    >
      <Image
        source={character.photo}
        style={{ width: photoSize, height: photoSize }}
        resizeMode="contain"
      />
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{circle}</TouchableOpacity>;
  }
  return circle;
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
});
