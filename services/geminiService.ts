
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { JobApplication, JobStatus } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const addJobApplication: FunctionDeclaration = {
    name: 'addJobApplication',
    description: 'Adds a new job application to the tracker.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            companyName: { type: Type.STRING, description: 'The name of the company.' },
            jobTitle: { type: Type.STRING, description: 'The title of the job position.' },
            applicationDate: { type: Type.STRING, description: 'The date of application in YYYY-MM-DD format. Infer today if not specified.' },
            status: { type: Type.STRING, enum: Object.values(JobStatus), description: 'The current status of the application.' },
            notes: { type: Type.STRING, description: 'Any notes or comments about the application.' },
            url: { type: Type.STRING, description: 'The URL to the job posting.' },
        },
        required: ['companyName', 'jobTitle', 'applicationDate', 'status'],
    },
};

const updateJobApplicationStatus: FunctionDeclaration = {
    name: 'updateJobApplicationStatus',
    description: 'Updates the status or other details of an existing job application.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            companyName: { type: Type.STRING, description: 'The name of the company to identify the application.' },
            jobTitle: { type: Type.STRING, description: 'The job title to further identify the application if there are multiple for one company.' },
            status: { type: Type.STRING, enum: Object.values(JobStatus), description: 'The new status of the application.' },
            notes: { type: Type.STRING, description: 'New notes to add or update for the application.' },
        },
        required: ['companyName'],
    },
};


type GeminiServiceResponse = 
  | { action: 'add', payload: Omit<JobApplication, 'id'> }
  | { action: 'update', payload: { companyName: string; jobTitle?: string } & Partial<Omit<JobApplication, 'id' | 'companyName' | 'jobTitle'>> }
  | { action: 'clarification', payload: string };

export const processUserInput = async (text: string, currentJobs: JobApplication[]): Promise<GeminiServiceResponse> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Here is the current list of job applications for context: ${JSON.stringify(currentJobs.map(j => ({ company: j.companyName, title: j.jobTitle })))}. User's request: "${text}"`,
            config: {
                systemInstruction: "You are an intelligent agent helping a user track their job applications. Your goal is to parse the user's natural language input and use the provided tools to add or update job application data. If a date is not specified for a new application, assume it is today's date. If an update is ambiguous, ask for clarification.",
                tools: [{ functionDeclarations: [addJobApplication, updateJobApplicationStatus] }],
            },
        });

        const functionCalls = response.functionCalls;
        
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const args = call.args;

            if (call.name === 'addJobApplication') {
                return {
                    action: 'add',
                    payload: {
                        companyName: args.companyName,
                        jobTitle: args.jobTitle,
                        applicationDate: args.applicationDate || new Date().toISOString().split('T')[0],
                        status: args.status || JobStatus.APPLIED,
                        notes: args.notes,
                        url: args.url,
                    }
                };
            }

            if (call.name === 'updateJobApplicationStatus') {
                 // Check if the company exists
                const companyExists = currentJobs.some(job => job.companyName.toLowerCase() === args.companyName.toLowerCase());
                if (!companyExists) {
                    return { action: 'clarification', payload: `I couldn't find an application for "${args.companyName}". Would you like to add it as a new application?` };
                }

                const payload: { companyName: string; jobTitle?: string } & Partial<Omit<JobApplication, 'id' | 'companyName' | 'jobTitle'>> = {
                    companyName: args.companyName,
                };
                if (args.jobTitle) payload.jobTitle = args.jobTitle;
                if (args.status) payload.status = args.status;
                if (args.notes) payload.notes = args.notes;

                return {
                    action: 'update',
                    payload: payload
                };
            }
        }
        
        const responseText = response.text?.trim();
        if (responseText) {
            return { action: 'clarification', payload: responseText };
        }

        throw new Error('No function call or text response from Gemini.');

    } catch (error) {
        console.error("Error processing user input with Gemini:", error);
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
    try {
        let systemInstruction = "";
        let contents = "";

        const hasCv = cvText && cvText.trim();
        const hasQuery = query && query.trim();

        if (hasCv) {
            systemInstruction = "You are an expert tech recruiter and career researcher. Your primary task is to find high-quality, *active* job opportunities for a candidate based on their resume. Use Google Search extensively. Key priorities:\n1. **Recency and Validity**: Prioritize job postings from the last few weeks. Before including a link, you MUST verify it is a live, direct link to the job description page. Do not include expired or broken links.\n2. **Credibility**: Give preference to links from official company career websites, LinkedIn, Indeed, or other reputable, major job boards. Avoid aggregators with poor user experience.\n3. **Relevance**: Ensure the jobs are a strong match for the candidate's skills and experience.\n4. **Sorting**: The final list of jobs MUST be sorted by the posting date in descending order (most recent first).\nReturn the results in the specified JSON format. Always try to find the `postingDate`.";
            if (hasQuery) {
                // Case: Resume + Query
                contents = `Analyze the following resume and find job postings that match the user's search query. Return the results sorted with the newest postings first. User's search query: "${query}".\n\nResume:\n"""\n${cvText}\n"""`;
            } else {
                // Case: Resume Only
                contents = `Analyze the following resume and find suitable job postings based on the candidate's profile. Return the results sorted with the newest postings first.\n\nResume:\n"""\n${cvText}\n"""`;
            }
        } else {
            // Case: Query Only (requires query to be present)
            if (!hasQuery) {
                return []; // Safeguard: don't search if there's nothing to search for.
            }
            systemInstruction = "You are a helpful job discovery assistant. Use Google Search to find relevant job postings and return them in the specified JSON format. Key priorities:\n1. **Recency and Validity**: Prioritize recent job postings. Verify links are active and direct to the job description. Do not include expired or broken links.\n2. **Credibility**: Prefer official company career sites and major job boards like LinkedIn.\n3. **Sorting**: Sort results by posting date, newest first.\nProvide direct links to the job application pages where possible.";
            contents = `Find job postings related to the following query: "${query}". Return the results sorted with the newest postings first.`;
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              tools: [{googleSearch: {}}],
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    companyName: { type: Type.STRING },
                    jobTitle: { type: Type.STRING },
                    url: { type: Type.STRING },
                    description: { type: Type.STRING, description: "A brief, one-sentence summary of why this job is a good match for the provided resume." },
                    postingDate: { type: Type.STRING, description: "The date the job was posted, in YYYY-MM-DD format or similar parsable date format. If not found, this can be omitted." }
                  },
                  required: ['companyName', 'jobTitle', 'url', 'description']
                }
              }
            }
        });
        
        const jsonText = response.text.trim();
        const jobs = JSON.parse(jsonText);
        return jobs;

    } catch (error) {
        console.error("Error finding jobs with Gemini:", error);
        throw new Error("The AI agent had trouble finding jobs. Please try a different search query.");
    }
}
