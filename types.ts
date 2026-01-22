
export enum JobStatus {
  APPLIED = 'Applied',
  INTERVIEWING = 'Interviewing',
  OFFER = 'Offer',
  REJECTED = 'Rejected',
  WISHLIST = 'Wishlist',
}

export interface JobApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  applicationDate: string;
  status: JobStatus;
  notes?: string;
  url?: string;
}
