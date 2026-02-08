export function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
