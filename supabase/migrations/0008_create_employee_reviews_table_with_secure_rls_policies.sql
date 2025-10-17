-- Create employee_reviews table (stores file metadata for uploaded performance reviews)
CREATE TABLE public.employee_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employee_reviews ENABLE ROW LEVEL SECURITY;

-- Policies: users can only manage their own review files
CREATE POLICY "employee_reviews_select_policy" ON public.employee_reviews 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "employee_reviews_insert_policy" ON public.employee_reviews 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "employee_reviews_delete_policy" ON public.employee_reviews 
FOR DELETE TO authenticated USING (auth.uid() = user_id);