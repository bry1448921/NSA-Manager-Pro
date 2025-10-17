-- Create employees table
CREATE TABLE public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ssn TEXT NOT NULL,
  dob DATE NOT NULL,
  position TEXT NOT NULL,
  manager TEXT NOT NULL,
  date_of_hire DATE NOT NULL,
  date_of_termination DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policies: users can only manage their own employees
CREATE POLICY "employees_select_policy" ON public.employees 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "employees_insert_policy" ON public.employees 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "employees_update_policy" ON public.employees 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "employees_delete_policy" ON public.employees 
FOR DELETE TO authenticated USING (auth.uid() = user_id);