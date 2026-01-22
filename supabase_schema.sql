-- Create the table
create table job_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  company_name text not null,
  job_title text not null,
  status text not null,
  application_date date,
  notes text,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (Security Policy)
alter table job_applications enable row level security;

-- Policy: Users can only see their own data
create policy "Users can see their own applications"
  on job_applications for select
  using ( auth.uid() = user_id );

-- Policy: Users can insert their own data
create policy "Users can insert their own applications"
  on job_applications for insert
  with check ( auth.uid() = user_id );

-- Policy: Users can update their own data
create policy "Users can update their own applications"
  on job_applications for update
  using ( auth.uid() = user_id );

-- Policy: Users can delete their own data
create policy "Users can delete their own applications"
  on job_applications for delete
  using ( auth.uid() = user_id );
