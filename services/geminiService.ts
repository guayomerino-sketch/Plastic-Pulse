/**
 * getPlasticAnalysis: simple wrapper to send a prompt to the AI and return the response text.
 * @param prompt - The prompt string to send to the model
 * @returns response text or an error message
 */
import { GoogleGenAI } from "@google/genai";

// Read the Vite-provided API key at runtime. Keep access via import.meta.env to avoid bundling secrets.
const VITE_API_KEY = (import.meta as any).env?.VITE_API_KEY as string | undefined;

let genAI: any | null = null;
if (VITE_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: VITE_API_KEY });
  // Do not log the key. Small developer hint only.
  console.log('AI Service: API key found, client initialized.');
} else {
  console.warn('AI Service: VITE_API_KEY not set. getPlasticAnalysis will return an error until the key is provided.');
}

/**
 * Exported function: getPlasticAnalysis
 * - prompt: user-entered prompt string
 * - returns: generated text or an error message
 */
export async function getPlasticAnalysis(prompt: string): Promise<string> {
  if (!prompt || !prompt.trim()) return 'Error: empty prompt.';
  if (!genAI) return 'Error: AI key not configured.';

  try {
    const systemInstruction = `You are an expert environmental impact analyst. Answer concisely in a data-first, urgent and empowering tone. Use short, factual lines and include: Object, Decomposition (years), Key impacts (2-3 short bullets with data when available), and a Recommended alternative.`;

    const fullPrompt = `${systemInstruction}\nUser Query: ${prompt}\nReturn only the concise analysis.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    // response.text should contain the model output; fall back to empty string.
    return (response && response.text) ? response.text : 'Error: empty response from AI.';
  } catch (err) {
    console.error('getPlasticAnalysis error:', err);
    return 'Error: could not retrieve AI response.';
  }
}