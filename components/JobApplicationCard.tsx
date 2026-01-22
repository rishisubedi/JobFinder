
import React from 'react';
import { JobApplication } from '../types';
import StatusBadge from './StatusBadge';

interface JobApplicationCardProps {
  job: JobApplication;
}

const JobApplicationCard: React.FC<JobApplicationCardProps> = ({ job }) => {
  return (
    <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700 shadow-lg hover:border-blue-500 transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{job.jobTitle}</h2>
          <p className="text-lg text-gray-300">{job.companyName}</p>
          <p className="text-sm text-gray-500 mt-1">Applied on: {new Date(job.applicationDate).toLocaleDateString()}</p>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={job.status} />
        </div>
      </div>
      {job.notes && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}
       {job.url && (
        <div className="mt-3">
          <a 
            href={job.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            View Job Posting
          </a>
        </div>
      )}
    </div>
  );
};

export default JobApplicationCard;
