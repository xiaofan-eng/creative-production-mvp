import { createOpenAI } from "@ai-sdk/openai";

const deepseek = createOpenAI({
  name: "deepseek",
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export const model = deepseek("deepseek-v4-pro");
