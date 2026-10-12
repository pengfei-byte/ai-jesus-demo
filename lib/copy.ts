export function inviteLine(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `Then come in, ${trimmed}.` : "Then come in, my child.";
}
