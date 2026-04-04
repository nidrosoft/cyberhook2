export function devError(label: string, err: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(label, err);
  }
}
