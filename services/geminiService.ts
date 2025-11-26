import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
You are "ZeroBot", a compassionate, firm, and knowledgeable addiction recovery specialist integrated into the "Zero Vício" app. 
Your goal is to help users maintain sobriety, overcome cravings, and stay motivated.
- Be empathetic but encouraging of discipline.
- If a user feels like relapsing, offer immediate grounding techniques (breathing, distraction).
- Keep responses concise and readable on mobile.
- Do not provide medical advice; suggest professional help for physical withdrawal symptoms.
`;

let chatSession: Chat | null = null;

export const getChatSession = (): Chat => {
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
  }
  return chatSession;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const chat = getChatSession();
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text || "Estou tendo dificuldades para conectar agora. Tente novamente em instantes.";
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "Erro de conexão. Por favor, verifique sua internet ou tente mais tarde.";
  }
};

export const generateDailyMotivation = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a short, powerful quote or tip in Portuguese for someone recovering from addiction today. Maximum 2 sentences.",
    });
    return response.text || "Um dia de cada vez.";
  } catch (error) {
    return "Sua jornada é importante. Continue firme.";
  }
};