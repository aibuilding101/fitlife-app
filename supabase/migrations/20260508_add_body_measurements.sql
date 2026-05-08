-- Add body circumference columns to measurements table
ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS chest_cm     DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS arm_left_cm  DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS arm_right_cm DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS waist_cm     DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS thigh_cm     DECIMAL(5,2);
