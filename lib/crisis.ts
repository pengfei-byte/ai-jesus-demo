export const CRISIS_REPLY =
  "If you are in danger, get help now. In the United States, call or text 988. Anywhere else, contact your local emergency services. I am with you, and you do not have to face this alone.";

export const CRISIS_PORTRAIT = "They were in distress and were pointed to immediate help.";

const PHRASES = [
  "kill myself",
  "end my life",
  "want to die",
  "suicide",
  "suicidal",
  "self-harm",
  "self harm",
  "cut myself",
  "hurting myself",
  "don't want to live",
  "do not want to live",
];

export function isCrisis(message: string): boolean {
  const haystack = message.toLowerCase();
  return PHRASES.some((phrase) => haystack.includes(phrase));
}
