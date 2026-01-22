
import React, { useState, useCallback, useEffect } from 'react';
import { JobApplication, JobStatus } from './types';
import { processUserInput } from './services/geminiService';
import JobApplicationCard from './components/JobApplicationCard';
import JobInputForm from './components/JobInputForm';
import Dashboard from './components/Dashboard';
import JobDiscoveryAgent from './components/JobDiscoveryAgent';
import Auth from './components/Auth';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchJobs();
    } else {
      setJobApplications([]);
    }
  }, [session]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('application_date', { ascending: false });

      if (error) {
        // Handle specific Supabase errors
        if (error.code === 'PGRST116' || error.message.includes('Could not find the table')) {
          setError('Database setup required. Please run the SQL script in your Supabase Dashboard.');
        } else if (error.code === 'PGRST301') { // JWT expired or invalid
          // Session might be stale, try to refresh or let the auth listener handle it
          setError('Session expired. Please sign out and sign in again.');
        } else {
          throw error;
        }
        return;
      }

      if (data) {
        // Map DB snake_case to frontend camelCase
        const mappedJobs: JobApplication[] = data.map((job: any) => ({
          id: job.id,
          user_id: job.user_id,
          companyName: job.company_name,
          jobTitle: job.job_title,
          status: job.status as JobStatus,
          applicationDate: job.application_date,
          notes: job.notes,
          url: job.url,
        }));
        setJobApplications(mappedJobs);
      }
    } catch (e: any) {
      console.error('Error fetching jobs:', e);
      if (e.message && e.message.includes('fetch')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(e.message || 'Failed to load job applications.');
      }
    }
  };

  const syncJobToSupabase = async (job: Omit<JobApplication, 'id'> & { id?: string }, action: 'insert' | 'update') => {
    if (!session?.user) return;

    try {
      const dbJob = {
        user_id: session.user.id,
        company_name: job.companyName,
        job_title: job.jobTitle,
        status: job.status,
        application_date: job.applicationDate,
        notes: job.notes,
        url: job.url,
      };

      if (action === 'insert') {
        const { data, error } = await supabase.from('job_applications').insert([dbJob]).select().single();
        if (error) throw error;
        return data;
      } else if (action === 'update' && job.id) {
        // For updates, we don't necessarily update user_id, but it's safe to include in RLS
        const { data, error } = await supabase
          .from('job_applications')
          .update(dbJob)
          .eq('id', job.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

    } catch (e: any) {
      console.error('Error syncing to Supabase:', e);
      setError(`Failed to save changes: ${e.message}`);
      throw e; // Re-throw to handle UI state updates accordingly if needed
    }
  };

  const handleUserInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await processUserInput(text, jobApplications);

      if (result.action === 'add') {
        // Add to Supabase
        const savedJob = await syncJobToSupabase(result.payload, 'insert');
        if (savedJob) {
          const newJob: JobApplication = { ...result.payload, id: savedJob.id, user_id: session?.user.id };
          setJobApplications(prev => [newJob, ...prev]);
        }
      } else if (result.action === 'update') {
        const { companyName, jobTitle, ...updates } = result.payload;

        // Find the job to update
        const jobToUpdate = jobApplications.find(job => {
          const companyMatch = job.companyName.toLowerCase() === companyName.toLowerCase();
          const titleMatch = !jobTitle || job.jobTitle.toLowerCase() === jobTitle.toLowerCase();
          return companyMatch && titleMatch;
        });

        if (jobToUpdate) {
          const updatedJobPayload = { ...jobToUpdate, ...updates };
          await syncJobToSupabase(updatedJobPayload, 'update');

          setJobApplications(prev =>
            prev.map(job => {
              if (job.id === jobToUpdate.id) {
                return updatedJobPayload;
              }
              return job;
            })
          );
        } else {
          setError(`Could not find a job for ${companyName} to update.`);
        }

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
  }, [jobApplications, session]);

  const handleAddJobToTracker = useCallback(async (job: Omit<JobApplication, 'id' | 'status' | 'applicationDate'>) => {
    const tempJob = {
      ...job,
      status: JobStatus.WISHLIST,
      applicationDate: new Date().toISOString().split('T')[0],
    };

    try {
      const savedJob = await syncJobToSupabase(tempJob, 'insert');
      if (savedJob) {
        const newJob: JobApplication = {
          ...tempJob,
          id: savedJob.id,
          user_id: session?.user.id
        };
        setJobApplications(prev => [newJob, ...prev]);
      }
    } catch (e) {
      // Error already handled in syncJobToSupabase
    }

  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <header className="py-6 px-4 sm:px-8 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Student Job Finder</h1>
            <p className="text-gray-400 mt-1">Use natural language to track your job applications.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded-md transition-colors"
          >
            Sign Out
          </button>
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
                  <p className="text-gray-500 text-lg">No visible applications.</p>
                  <p className="text-gray-600">Try "I applied to Google..." or clean the filters.</p>
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