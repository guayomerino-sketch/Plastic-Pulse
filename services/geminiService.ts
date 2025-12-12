/**
 * getPlasticAnalysis: simple wrapper to send a prompt to the AI and return the response text.
 * @param prompt - The prompt string to send to the model
 * @returns response text or an error message
 */
import { GoogleGenAI } from "@google/genai";

// Initialize GoogleGenAI with Vite runtime API key (import.meta.env.VITE_API_KEY)
// Avoid using process.env in client-side code.
// Read VITE_API_KEY from Vite's import.meta.env. Use a typed-safe access to avoid TS errors.
const VITE_API_KEY = (import.meta as any).env?.VITE_API_KEY as string || '';
const genAI = new GoogleGenAI({ apiKey: VITE_API_KEY });
if (!VITE_API_KEY) {
  console.warn('VITE_API_KEY is missing; AI calls will fail until you set it in .env.local');
}

// Simple confirmation log for developer visibility (do not print keys)
console.log("AI Service Connected");

/**
 * Send a prompt to the Google GenAI model and return the generated text.
 */
export async function getPlasticAnalysis(prompt: string): Promise<string> {
  console.log('getPlasticAnalysis called');
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'Error: could not retrieve AI response.';
  }
}