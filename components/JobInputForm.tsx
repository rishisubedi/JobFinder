
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface JobInputFormProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

const JobInputForm: React.FC<JobInputFormProps> = ({ onSubmit, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputValue);
    setInputValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="e.g., I have an interview with Amazon for the SDE role next week"
        className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg flex items-center justify-center transition-all disabled:bg-blue-800 disabled:cursor-not-allowed"
        disabled={isLoading || !inputValue.trim()}
      >
        {isLoading ? <LoadingSpinner /> : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
        )}
      </button>
    </form>
  );
};

export default JobInputForm;
