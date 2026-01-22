
import React, { useState, useCallback } from 'react';
import { JobApplication, JobStatus } from './types';
import { processUserInput } from './services/geminiService';
import JobApplicationCard from './components/JobApplicationCard';
import JobInputForm from './components/JobInputForm';
import Dashboard from './components/Dashboard';
import JobDiscoveryAgent from './components/JobDiscoveryAgent';

const App: React.FC = () => {
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUserInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await processUserInput(text, jobApplications);

      if (result.action === 'add') {
        const newJob = { ...result.payload, id: Date.now().toString() };
        setJobApplications(prev => [newJob, ...prev]);
      } else if (result.action === 'update') {
        const { companyName, jobTitle, ...updates } = result.payload;
        setJobApplications(prev =>
          prev.map(job => {
            const companyMatch = job.companyName.toLowerCase() === companyName.toLowerCase();
            const titleMatch = !jobTitle || job.jobTitle.toLowerCase() === jobTitle.toLowerCase();
            if (companyMatch && titleMatch) {
              return { ...job, ...updates };
            }
            return job;
          })
        );
      } else if (result.action === 'clarification') {
        setError(result.payload);
      }
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred. Please try rephrasing.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [jobApplications]);
  
  const handleAddJobToTracker = useCallback((job: Omit<JobApplication, 'id' | 'status' | 'applicationDate'>) => {
    const newJob: JobApplication = {
      ...job,
      id: Date.now().toString(),
      status: JobStatus.WISHLIST,
      applicationDate: new Date().toISOString().split('T')[0],
    };
    setJobApplications(prev => [newJob, ...prev]);
  }, []);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <header className="py-6 px-4 sm:px-8 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-white">Student Job Finder</h1>
            <p className="text-gray-400 mt-1">Use natural language to track your job applications.</p>
        </div>
      </header>

      <main className="flex-grow py-8 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <Dashboard jobs={jobApplications} />
          
          <JobDiscoveryAgent onAddJob={handleAddJobToTracker} />

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-300 mb-4">Tracked Applications</h2>
            <div className="space-y-4 pb-32">
              {jobApplications.length === 0 && !isLoading ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-700 rounded-lg">
                  <p className="text-gray-500 text-lg">No applications tracked yet.</p>
                  <p className="text-gray-600">Try adding one above, e.g., "I applied to Google as a Software Engineer today."</p>
                </div>
              ) : (
                jobApplications.map(job => <JobApplicationCard key={job.id} job={job} />)
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-5xl mx-auto p-4">
          <JobInputForm onSubmit={handleUserInput} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
};

export default App;