-- Run in Supabase SQL Editor

-- Add body measurement columns
ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS chest_cm DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS arm_left_cm DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS arm_right_cm DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS waist_cm DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS thigh_cm DECIMAL(5,1);

-- Unique constraint: one measurement per user per day
ALTER TABLE measurements
  DROP CONSTRAINT IF EXISTS measurements_user_date_unique;
ALTER TABLE measurements
  ADD CONSTRAINT measurements_user_date_unique UNIQUE (user_id, date);

-- Add macro/profile fields to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS macro_target_calories DECIMAL(7,1),
  ADD COLUMN IF NOT EXISTS macro_target_protein DECIMAL(6,1),
  ADD COLUMN IF NOT EXISTS macro_target_carbs DECIMAL(6,1),
  ADD COLUMN IF NOT EXISTS macro_target_fat DECIMAL(6,1);
