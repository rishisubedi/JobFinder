
import React, { useMemo } from 'react';
import { JobApplication, JobStatus } from '../types';

interface DashboardProps {
  jobs: JobApplication[];
}

const statusConfig = {
    [JobStatus.APPLIED]: { color: 'blue', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> },
    [JobStatus.INTERVIEWING]: { color: 'yellow', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    [JobStatus.OFFER]: { color: 'green', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v4m-2-2h4m5 6v4m-2-2h4M17 3l-4 4-4-4m5 16l4-4 4 4" /></svg> },
    [JobStatus.REJECTED]: { color: 'red', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    [JobStatus.WISHLIST]: { color: 'purple', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
};

const statusColors: Record<string, { bg: string, text: string, border: string }> = {
    blue: { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
    yellow: { bg: 'bg-yellow-900/30', text: 'text-yellow-300', border: 'border-yellow-700' },
    green: { bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
    red: { bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700' },
    purple: { bg: 'bg-purple-900/30', text: 'text-purple-300', border: 'border-purple-700' },
};


const Dashboard: React.FC<DashboardProps> = ({ jobs }) => {
    const stats = useMemo(() => {
        const counts = jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        }, {} as Record<JobStatus, number>);

        return Object.values(JobStatus).map(status => ({
            status,
            count: counts[status] || 0,
            ...statusConfig[status],
        }));
    }, [jobs]);

    if (jobs.length === 0) {
        return null; // Don't show the dashboard if there are no jobs
    }

    return (
        <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-300 mb-4">Application Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {stats.map(({ status, count, color, icon }) => {
                    const colors = statusColors[color];
                    return (
                        <div key={status} className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
                            <div className={`flex items-center justify-between ${colors.text}`}>
                                <h3 className="font-semibold">{status}</h3>
                                {icon}
                            </div>
                            <p className="text-3xl font-bold text-white mt-2">{count}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dashboard;
