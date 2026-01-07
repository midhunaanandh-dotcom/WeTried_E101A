
import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types";

export const getAcademicAdvice = async (history: Message[], userInput: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        {
          role: 'user',
          parts: [{ text: userInput }]
        }
      ],
      config: {
        systemInstruction: `You are the Amrita Academic Advisor AI. You help students with academic rules, schedules, and general campus information. 
        Context: The student is Arjun K, Roll: CB.EN.U4CSE21001, 6th Sem CSE.
        You know all campus regulations including the 75% attendance requirement and grading policies.
        Keep your tone formal, helpful, and supportive.`,
        temperature: 0.7,
      }
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to service.";
  }
};

export const getNavigationIntent = async (userInput: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: userInput }] }],
      config: {
        systemInstruction: `Identify the navigation target based on the user's request. 
        Clues mapping:
        - "how much money", "dues", "bills", "payment", "fees" -> Finance
        - "where is my home", "personal info", "change email", "my phone number", "address" -> Profile
        - "latest news", "notices", "circulars" -> Announcements
        - "grades", "my performance", "attendance status" -> Academics
        - "when is my next test", "exam dates" -> Exam Schedule
        - "general", "overview", "status" -> Dashboard

        Return ONLY the tab name.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetTab: { 
              type: Type.STRING,
              description: 'The target navigation tab name.'
            },
          },
          required: ["targetTab"]
        }
      }
    });
    
    const jsonStr = response.text?.trim() || '{"targetTab": "None"}';
    const result = JSON.parse(jsonStr);
    return result.targetTab;
  } catch (e) {
    console.error("Navigation Intent Error:", e);
    return 'None';
  }
};
