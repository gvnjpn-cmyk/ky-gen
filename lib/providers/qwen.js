import { overchatAsk } from "./_overchat-base.js";

export const meta = { id: "qwen", label: "Qwen3 Next 80B" };

export async function ask(prompt, system) {
  return overchatAsk({
    prompt,
    system,
    model: "alibaba/qwen3-next-80b-a3b-instruct",
    personaId: "qwen-3-landing",
  });
}
