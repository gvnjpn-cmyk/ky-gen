import * as claudeHaiku from "./claude-haiku.js";
import * as qwen from "./qwen.js";
import * as deepai from "./deepai.js";
import * as gpt4oMini from "./gpt-4o-mini.js";
import * as chatgpt from "./chatgpt.js";
import * as perplexity from "./perplexity.js";
import * as kimi from "./kimi.js";

export const PROVIDERS = [claudeHaiku, qwen, deepai, gpt4oMini, chatgpt, perplexity, kimi];

export const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.meta.id, p]));

export const PROVIDER_LIST = PROVIDERS.map((p) => p.meta);
