-- Migration: Fix profiles role constraint to allow 'worker' role
-- Created: 2026-03-24

-- Drop existing check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new check constraint that includes 'worker'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'worker', 'employee'));

-- Update existing 'employee' roles to 'worker'
UPDATE public.profiles SET role = 'worker' WHERE role = 'employee';
