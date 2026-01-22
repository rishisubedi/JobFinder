
import React, { useState, useRef } from 'react';
import { findJobs, DiscoveredJob } from '../services/geminiService';
import { JobApplication } from '../types';
import LoadingSpinner from './LoadingSpinner';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure the worker for pdf.js to match the library version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;


interface JobDiscoveryAgentProps {
    onAddJob: (job: Omit<JobApplication, 'id' | 'status' | 'applicationDate'>) => void;
}

const JobDiscoveryAgent: React.FC<JobDiscoveryAgentProps> = ({ onAddJob }) => {
    const [query, setQuery] = useState('');
    const [cvText, setCvText] = useState('');
    const [location, setLocation] = useState('');
    const [jobType, setJobType] = useState('any');
    const [duration, setDuration] = useState('any');
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<DiscoveredJob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const runSearch = async (searchQuery: string, resumeText: string) => {
        if (!resumeText && !searchQuery.trim() && !location.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            // Build a more detailed query string from all filters
            const locationQuery = location.trim() ? ` in ${location.trim()}` : '';
            const jobTypeQuery = jobType !== 'any' ? ` ${jobType}` : '';
            const durationQuery = duration !== 'any' ? ` posted in the ${duration}` : '';
            const fullQuery = `${jobTypeQuery} ${searchQuery}${locationQuery}${durationQuery}`.trim();

            const jobs = await findJobs(fullQuery, resumeText);

            // Defensively sort results by date, newest first.
            const sortedJobs = jobs.sort((a, b) => {
                if (!a.postingDate) return 1; // push items without date to the end
                if (!b.postingDate) return -1;
                return new Date(b.postingDate).getTime() - new Date(a.postingDate).getTime();
            });

            setResults(sortedJobs);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setUploadedFileName(file.name);
        setError(null);
        setResults([]); // Clear previous results
        // Reset filters on new resume upload
        setQuery('');
        setLocation('');
        setJobType('any');

        let parsedText = '';
        try {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            
            if (fileExtension === 'pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const typedArray = new Uint8Array(arrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    parsedText += textContent.items.map((item: any) => item.str).join(' ');
                }
            } else if (fileExtension === 'docx') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                parsedText = result.value;
            } else if (fileExtension === 'txt') {
                parsedText = await file.text();
            } else {
                throw new Error('Unsupported file type. Please upload a .pdf, .docx, or .txt file.');
            }
            
            setCvText(parsedText);
            await runSearch('', parsedText); // Automatically search with the new resume

        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'An error occurred while parsing the file.';
            setError(message);
            setUploadedFileName(null);
            setIsLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch(query, cvText);
    };
    
    return (
        <div className="my-8 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
            <h2 className="text-xl font-semibold text-white mb-2">Job Discovery Agent</h2>
            <p className="text-gray-400 mb-4">Upload your resume to discover verified, recent job postings tailored to your profile.</p>
            
            <div className="mb-4">
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".txt,.pdf,.docx"
                    aria-label="Upload your resume"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                    Upload Resume (.pdf, .docx, .txt)
                </button>
                {uploadedFileName && <span className="ml-4 text-gray-400 text-sm">{uploadedFileName}</span>}
            </div>

            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Keywords (e.g., 'React')"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                    disabled={isLoading}
                />
                 <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, state, or 'remote'"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <select 
                    value={jobType} 
                    onChange={e => setJobType(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="any">Any Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                </select>
                <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-5 rounded-lg flex items-center justify-center transition-colors disabled:bg-purple-800 disabled:cursor-not-allowed"
                    disabled={isLoading || (!cvText && !query.trim() && !location.trim())}
                >
                    {isLoading ? <LoadingSpinner /> : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </button>
            </form>

            {error && (
                <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            
            {results.length > 0 && (
                <div className="mt-6 space-y-3">
                    {results.map((job, index) => (
                        <div key={index} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                           <div className="flex-grow">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-white">{job.jobTitle}</h3>
                                    <p className="text-gray-300">{job.companyName}</p>
                                </div>
                                {job.postingDate && <p className="text-xs text-gray-500 flex-shrink-0 ml-4 mt-1">{new Date(job.postingDate).toLocaleDateString()}</p>}
                             </div>
                             <p className="text-sm text-gray-400 mt-1">{job.description}</p>
                              <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline mt-2 inline-block">View Posting</a>
                           </div>
                           <button 
                             onClick={() => onAddJob(job)}
                             className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-3 rounded-lg whitespace-nowrap transition-colors self-start sm:self-center"
                           >
                             Add to Wishlist
                           </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JobDiscoveryAgent;
