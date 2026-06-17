import { overchatAsk } from "./_overchat-base.js";

export const meta = { id: "claude-haiku", label: "Claude Haiku 4.5" };

export async function ask(prompt, system) {
  return overchatAsk({
    prompt,
    system,
    model: "claude-haiku-4-5-20251001",
    personaId: "claude-haiku-4-5-landing",
  });
}
