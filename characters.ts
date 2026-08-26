export type CharacterDef = {
  id: string;
  name: string;
  file: any;
  photo: any;
  bgColor: string;
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: "orange",
    name: "Portakal",
    bgColor: "#FDEBD3",
    file: require("./assets/lottie/characters/orange.json"),
    photo: require("./assets/lottie/characters/photos/orange.png"),
  },
  {
    id: "broccoli",
    name: "Brokoli",
    bgColor: "#E3F2D9",
    file: require("./assets/lottie/characters/broccoli.json"),
    photo: require("./assets/lottie/characters/photos/broccoli.png"),
  },
  {
    id: "taco",
    name: "Taco",
    bgColor: "#FBEAD1",
    file: require("./assets/lottie/characters/taco.json"),
    photo: require("./assets/lottie/characters/photos/taco.png"),
  },
  {
    id: "donut",
    name: "Donut",
    bgColor: "#FBE4E4",
    file: require("./assets/lottie/characters/donut.json"),
    photo: require("./assets/lottie/characters/photos/donut.png"),
  },
  {
    id: "pothos",
    name: "Pothos",
    bgColor: "#E1F0DE",
    file: require("./assets/lottie/characters/pothos.json"),
    photo: require("./assets/lottie/characters/photos/pothos.png"),
  },
  {
    id: "fries",
    name: "Patates",
    bgColor: "#FDF3D0",
    file: require("./assets/lottie/characters/fries.json"),
    photo: require("./assets/lottie/characters/photos/fries.png"),
  },
  {
    id: "coffee",
    name: "Kahve",
    bgColor: "#EDE0D4",
    file: require("./assets/lottie/characters/coffee.json"),
    photo: require("./assets/lottie/characters/photos/coffee.png"),
  },
  {
    id: "amongus",
    name: "Gizemli",
    bgColor: "#E1EAF7",
    file: require("./assets/lottie/characters/amongus.json"),
    photo: require("./assets/lottie/characters/photos/amongus.png"),
  },
];
