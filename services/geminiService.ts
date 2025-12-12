import { GoogleGenAI } from "@google/genai";

// Initialize client with Vite runtime env. Do NOT use process.env in browser code.
const apiKey = (import.meta.env.VITE_API_KEY as string) || '';
if (!apiKey) {
  console.warn('VITE_API_KEY is not set. AI calls will fail without a valid API key.');
}

const ai = new GoogleGenAI({ apiKey });

/**
 * getPlasticAnalysis: simple wrapper to send a prompt to the AI and return the response text.
 * @param prompt - The prompt string to send to the model
 * @returns response text or an error message
 */
export async function getPlasticAnalysis(prompt: string): Promise<string> {
  console.log('getPlasticAnalysis called');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'Error: could not retrieve AI response.';
  }
}