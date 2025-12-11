import { GoogleGenAI, Type } from "@google/genai";

// Use Vite's env runtime variable. Ensure you have VITE_API_KEY set in your .env (or .env.local).
const apiKey = (import.meta.env.VITE_API_KEY as string) || '';
const ai = new GoogleGenAI({ apiKey });

export const getBiomeImpactAnalysis = async (itemName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a concise, scientifically accurate, yet emotionally resonant paragraph (approx 80 words) describing the specific impact of a "${itemName}" on marine and terrestrial biomes. Mention how long it takes to degrade and one specific animal often harmed by it.`,
    });
    return response.text || "Impact analysis unavailable at the moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not retrieve AI analysis. Please check your connection.";
  }
};

export const getMotivationalTip = async (totalSavedGrams: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user has refused ${totalSavedGrams} grams of plastic so far. Give them a short, motivating, 1-sentence fact or comparison about what that achievement means for the planet (e.g., "That's equivalent to saving X turtles...").`,
    });
    return response.text || "Keep up the great work! Every gram counts.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "You are making a difference!";
  }
};

export const getFuturePrediction = async (currentTrend: 'improving' | 'worsening'): Promise<string> => {
  try {
     const prompt = currentTrend === 'improving'
      ? "Describe a hopeful future vision of 2050 where humanity successfully reduced plastic usage by 80%. Describe the state of the oceans and cities in 3 sentences."
      : "Describe a warning vision of 2050 where plastic usage continued to rise. Describe the state of the oceans and cities in 3 sentences.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Prediction unavailable.";
  } catch (error) {
    return "Prediction unavailable.";
  }
}

export const analyzePlasticImage = async (base64Image: string): Promise<{name: string, alternative: string, fact: string}> => {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "Identify the main plastic item in this photo." }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "What is the item?" },
            alternative: { type: Type.STRING, description: "An innovative eco-friendly alternative companies could use." },
            fact: { type: Type.STRING, description: "A short, scary fact about this item's impact on animals." }
          }
        }
      }
    });
    
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Vision Error", error);
    return {
      name: "Unknown Plastic",
      alternative: "Reusable materials",
      fact: "Plastic pollution affects every corner of the globe."
    };
  }
}