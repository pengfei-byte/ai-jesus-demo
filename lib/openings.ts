const OPENINGS: Array<(name: string) => string> = [
  (name) => `${name}, peace to you. I am glad you came to sit with me.`,
  (name) => `I see you, ${name}. You do not have to carry this hour alone.`,
  (name) => `${name}, come and rest a moment. I am here with you.`,
  (name) => `Welcome, ${name}. Tell me what is on your heart.`,
  (name) => `${name}, you are known, and you are welcome here.`,
  (name) => `I have been waiting for you, ${name}. Speak freely.`,
  (name) => `${name}, draw near. There is nothing you must hide from me.`,
  (name) => `Peace, ${name}. Let us begin with what is true.`,
  (name) => `${name}, I am glad to see your face. What would you like to tell me?`,
  (name) => `Here I am, ${name}. You have my attention.`,
];

export const OPENING_COUNT = OPENINGS.length;

export function openingFor(name: string, index: number): string {
  const who = name.trim() || "my child";
  const line = OPENINGS[Math.abs(index) % OPENINGS.length];
  return line(who);
}

export function greetingRequest(line: string): string {
  return `I just sat down with you and I have not spoken. Greet me first, aloud, using exactly these words and nothing more: "${line}"`;
}
