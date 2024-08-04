export enum ColorEnum {
  WHITE,
  BLACK,
  RED,
  BLUE,
  GREEN,
  ORANGE,
  YELLOW,
  PURPLE,
}

export const ColorMap: Record<ColorEnum, string> = {
  [ColorEnum.WHITE]: "#ffffff",
  [ColorEnum.BLACK]: "#000000",
  [ColorEnum.RED]: "#ff0000",
  [ColorEnum.BLUE]: "#0000ff",
  [ColorEnum.GREEN]: "#00ff00",
  [ColorEnum.ORANGE]: "#ffa500",
  [ColorEnum.YELLOW]: "#ffff00",
  [ColorEnum.PURPLE]: "#800080",
};

export function getColorName(colorEnum: ColorEnum): string | undefined {
  return ColorEnum[colorEnum];
}

export function getColorEnum(colorName: string): ColorEnum | undefined {
  return ColorEnum[colorName.toUpperCase() as keyof typeof ColorEnum];
}