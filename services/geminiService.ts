
import { GoogleGenAI, Modality } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  /**
   * Generates a note sound using Gemini 2.5 Flash Preview TTS
   */
  async generateNote(instrument: string, noteDescription: string): Promise<string | undefined> {
    try {
      const prompt = `Say cheerfully: Now playing a ${noteDescription} on a ${instrument}. Then play a single, clear, high-quality audio sample of a ${instrument} playing the note ${noteDescription}. The sound should be sustain and clear.`;
      
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64Audio;
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      return undefined;
    }
  }

  /**
   * (Optional) Analyzes the image to suggest hotspots
   */
  async suggestHotspots(imageBase64: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
            { text: "Identify the parts of this instrument that can be played. List them briefly." }
          ]
        },
      });
      return response.text || "No suggestions found.";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return "Error identifying parts.";
    }
  }
}

export const gemini = new GeminiService();
