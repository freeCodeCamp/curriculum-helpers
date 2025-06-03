declare module "util/util" {
  export function inspect(
    obj: unknown,
    opts?: {
      depth?: number;
      showHidden?: boolean;
      colors?: boolean;
      customInspect?: boolean;
    },
  ): string;
}
