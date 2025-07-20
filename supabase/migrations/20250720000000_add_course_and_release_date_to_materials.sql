-- Add course_id and release_date to materials table
ALTER TABLE public.materials
ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
ADD COLUMN release_date timestamp with time zone DEFAULT now();

-- Create index for course_id
CREATE INDEX idx_materials_course_id ON public.materials(course_id);

-- Create index for release_date
CREATE INDEX idx_materials_release_date ON public.materials(release_date);

-- Create composite index for filtering
CREATE INDEX idx_materials_course_release ON public.materials(course_id, release_date);

-- Update existing materials to have a default course if needed
-- This is commented out - uncomment and update with actual course_id if needed
-- UPDATE public.materials SET course_id = 'your-default-course-id' WHERE course_id IS NULL;

-- Make course_id NOT NULL after updating existing records
-- ALTER TABLE public.materials ALTER COLUMN course_id SET NOT NULL;