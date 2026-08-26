export type FruitType =
  | "domates"
  | "cilek"
  | "biber"
  | "limon"
  | "karpuz"
  | "patlican";

export const PLANT_IMAGES: Record<FruitType, any[]> = {
  domates: [
    require("../assets/plants/domates/stage-0.png"),
    require("../assets/plants/domates/stage-1.png"),
    require("../assets/plants/domates/stage-2.png"),
    require("../assets/plants/domates/stage-3.png"),
    require("../assets/plants/domates/stage-4.png"),
    require("../assets/plants/domates/stage-5.png"),
    require("../assets/plants/domates/stage-6.png"),
    require("../assets/plants/domates/stage-7.png"),
    require("../assets/plants/domates/stage-8.png"),
  ],
  cilek: [
    require("../assets/plants/cilek/stage-0.png"),
    require("../assets/plants/cilek/stage-1.png"),
    require("../assets/plants/cilek/stage-2.png"),
    require("../assets/plants/cilek/stage-3.png"),
    require("../assets/plants/cilek/stage-4.png"),
    require("../assets/plants/cilek/stage-5.png"),
    require("../assets/plants/cilek/stage-6.png"),
    require("../assets/plants/cilek/stage-7.png"),
    require("../assets/plants/cilek/stage-8.png"),
  ],
  biber: [
    require("../assets/plants/biber/stage-0.png"),
    require("../assets/plants/biber/stage-1.png"),
    require("../assets/plants/biber/stage-2.png"),
    require("../assets/plants/biber/stage-3.png"),
    require("../assets/plants/biber/stage-4.png"),
    require("../assets/plants/biber/stage-5.png"),
    require("../assets/plants/biber/stage-6.png"),
    require("../assets/plants/biber/stage-7.png"),
    require("../assets/plants/biber/stage-8.png"),
  ],
  limon: [
    require("../assets/plants/limon/stage-0.png"),
    require("../assets/plants/limon/stage-1.png"),
    require("../assets/plants/limon/stage-2.png"),
    require("../assets/plants/limon/stage-3.png"),
    require("../assets/plants/limon/stage-4.png"),
    require("../assets/plants/limon/stage-5.png"),
    require("../assets/plants/limon/stage-6.png"),
    require("../assets/plants/limon/stage-7.png"),
    require("../assets/plants/limon/stage-8.png"),
  ],
  karpuz: [
    require("../assets/plants/karpuz/stage-0.png"),
    require("../assets/plants/karpuz/stage-1.png"),
    require("../assets/plants/karpuz/stage-2.png"),
    require("../assets/plants/karpuz/stage-3.png"),
    require("../assets/plants/karpuz/stage-4.png"),
    require("../assets/plants/karpuz/stage-5.png"),
    require("../assets/plants/karpuz/stage-6.png"),
    require("../assets/plants/karpuz/stage-7.png"),
    require("../assets/plants/karpuz/stage-8.png"),
  ],
  patlican: [
    require("../assets/plants/patlican/stage-0.png"),
    require("../assets/plants/patlican/stage-1.png"),
    require("../assets/plants/patlican/stage-2.png"),
    require("../assets/plants/patlican/stage-3.png"),
    require("../assets/plants/patlican/stage-4.png"),
    require("../assets/plants/patlican/stage-5.png"),
    require("../assets/plants/patlican/stage-6.png"),
    require("../assets/plants/patlican/stage-7.png"),
    require("../assets/plants/patlican/stage-8.png"),
  ],
};

export const PLANT_THUMBS: Record<FruitType, any> = {
  domates: require("../assets/plants/thumbs/domates.png"),
  cilek: require("../assets/plants/thumbs/cilek.png"),
  biber: require("../assets/plants/thumbs/biber.png"),
  limon: require("../assets/plants/thumbs/limon.png"),
  karpuz: require("../assets/plants/thumbs/karpuz.png"),
  patlican: require("../assets/plants/thumbs/patlican.png"),
};
