
import React from 'react';
import { JobStatus } from '../types';

interface StatusBadgeProps {
  status: JobStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: Record<JobStatus, string> = {
    [JobStatus.APPLIED]: 'bg-blue-900 text-blue-200 border-blue-700',
    [JobStatus.INTERVIEWING]: 'bg-yellow-900 text-yellow-200 border-yellow-700',
    [JobStatus.OFFER]: 'bg-green-900 text-green-200 border-green-700',
    [JobStatus.REJECTED]: 'bg-red-900 text-red-200 border-red-700',
    [JobStatus.WISHLIST]: 'bg-purple-900 text-purple-200 border-purple-700',
  };

  return (
    <span
      className={`px-3 py-1 text-sm font-semibold rounded-full border ${
        statusStyles[status] || 'bg-gray-700 text-gray-200 border-gray-500'
      }`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
