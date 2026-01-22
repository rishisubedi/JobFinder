
import { HfInference } from '@huggingface/inference';
import { JobApplication, JobStatus } from '../types';

const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;

// We can use a model that is good at JSON extraction, e.g., mistralai/Mistral-7B-Instruct-v0.2
// If no token is provided, we can try to use the public API (rate limited) or prompt the user.
const hf = new HfInference(HF_TOKEN);

type GeminiServiceResponse =
    | { action: 'add', payload: Omit<JobApplication, 'id'> }
    | { action: 'update', payload: { companyName: string; jobTitle?: string } & Partial<Omit<JobApplication, 'id' | 'companyName' | 'jobTitle'>> }
    | { action: 'clarification', payload: string };

export const processUserInput = async (text: string, currentJobs: JobApplication[]): Promise<GeminiServiceResponse> => {
    try {
        const prompt = `
You are a smart job application tracker assistant. Your goal is to extract job application details from the user's input and return a pure JSON object.

Current Job List for Context: ${JSON.stringify(currentJobs.map(j => ({ company: j.companyName, title: j.jobTitle })))}

User Input: "${text}"

Instructions:
1. Identify if the user wants to ADD a new application or UPDATE an existing one.
2. If ADDing:
   - Extract 'companyName', 'jobTitle', 'applicationDate' (YYYY-MM-DD, default to today if not found), 'status' (Applied, Interviewing, Offer, Rejected, Wishlist), 'notes', 'url'.
   - Return valid JSON: { "action": "add", "payload": { ...fields... } }
3. If UPDATING:
   - Identify the 'companyName' and optionally 'jobTitle' to match the existing job.
   - Extract the fields to change.
   - Return valid JSON: { "action": "update", "payload": { "companyName": "...", ...updates... } }
4. If the input is unclear or ambiguous, return JSON: { "action": "clarification", "payload": "Ask a clarifying question..." }

IMPORTANT: Return ONLY the raw JSON object. Do not include markdown formatting (like \`\`\`json), explanations, or extra text.
`;

        const response = await hf.textGeneration({
            model: 'HuggingFaceH4/zephyr-7b-beta',
            inputs: prompt,
            parameters: {
                max_new_tokens: 500,
                return_full_text: false,
                temperature: 0.1, // Low temperature for deterministic output
            }
        });

        const generatedText = response.generated_text.trim();

        // Clean up potential markdown code blocks if the model ignores instruction
        const jsonString = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const result = JSON.parse(jsonString);
            return result;
        } catch (parseError) {
            console.error("Failed to parse LLM response as JSON:", generatedText);
            return { action: 'clarification', payload: "I understood that, but I had trouble processing the details. Could you try rephrasing?" };
        }

    } catch (error) {
        console.error("Error processing user input with Hugging Face:", error);
        if (!HF_TOKEN) {
            throw new Error("Hugging Face API token is missing. Please add VITE_HF_TOKEN to your .env.local file.");
        }
        throw new Error("There was a problem reaching the AI agent. Please check your connection and try again.");
    }
};

export type DiscoveredJob = {
    companyName: string;
    jobTitle: string;
    url: string;
    description: string;
    postingDate?: string;
}

export const findJobs = async (query: string, cvText?: string): Promise<DiscoveredJob[]> => {
    // For now, returning empty as web search requires a different toolset with HF
    // Ideally we would integrate a search API here
    return [];
}
