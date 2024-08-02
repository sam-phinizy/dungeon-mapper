// colors.js

export const ColorEnum = {
  WHITE: 0,
  BLACK: 1,
  RED: 2,
  BLUE: 3,
  GREEN: 4,
  ORANGE: 5,
  YELLOW: 6,
  PURPLE: 7,
};

export const ColorMap = {
  [ColorEnum.WHITE]: "#ffffff",
  [ColorEnum.BLACK]: "#000000",
  [ColorEnum.RED]: "#ff0000",
  [ColorEnum.BLUE]: "#0000ff",
  [ColorEnum.GREEN]: "#00ff00",
  [ColorEnum.ORANGE]: "#ffa500",
  [ColorEnum.YELLOW]: "#ffff00",
  [ColorEnum.PURPLE]: "#800080",
};

export function getColorName(colorEnum) {
  return Object.keys(ColorEnum).find((key) => ColorEnum[key] === colorEnum);
}

export function getColorEnum(colorName) {
  return ColorEnum[colorName.toUpperCase()];
}
