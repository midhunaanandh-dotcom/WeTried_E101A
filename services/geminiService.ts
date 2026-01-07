
import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAcademicAdvice = async (history: Message[], userInput: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: `You are the Amrita Academic Advisor AI. You help students with academic rules, schedules, and general campus information. 
          Context: The student is Arjun K, Roll: CB.EN.U4CSE21001, 6th Sem CSE.
          Keep your tone formal, helpful, and supportive.
          Current Query: ${userInput}` }]
        }
      ],
      config: {
        systemInstruction: "You are a professional academic advisor at Amrita University. You know all campus regulations including the 75% attendance requirement and grading policies.",
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: userInput }] }],
      config: {
        systemInstruction: `Identify the navigation target based on the user's CLUE or request. 
        Clues mapping:
        - "how much money", "dues", "bills", "payment", "fees" -> Finance
        - "where is my home", "personal info", "change email", "my phone number", "address" -> Profile
        - "latest news", "notices", "what happened", "circulars" -> Announcements
        - "grades", "my performance", "how many credits", "attendance status" -> Academics
        - "when is my next test", "timetable", "where is hall", "exam dates" -> Exam Schedule
        - "general", "overview", "status" -> Dashboard

        Return ONLY the tab name from: 'Dashboard', 'Academics', 'Finance', 'Exam Schedule', 'Announcements', 'Profile'. If unsure, return 'None'.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetTab: { type: Type.STRING },
          },
          required: ["targetTab"]
        }
      }
    });
    
    const result = JSON.parse(response.text || '{"targetTab": "None"}');
    return result.targetTab;
  } catch (e) {
    return 'None';
  }
};
