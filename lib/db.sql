-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  weight_kg DECIMAL(5,2),
  target_weight_kg DECIMAL(5,2),
  body_fat_percent DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Goals (Squat, Bench, Deadlift, Weight, Body Fat)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- 'squat', 'bench', 'deadlift', 'weight', 'body_fat'
  target_value DECIMAL(10,2) NOT NULL,
  target_unit TEXT, -- 'lbs', 'kg', '%'
  deadline DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Nutrition Logs
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  raw_input TEXT,
  meals JSONB,
  protein_g DECIMAL(10,2),
  carbs_g DECIMAL(10,2),
  fat_g DECIMAL(10,2),
  calories DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workout Logs
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  raw_input TEXT,
  exercises JSONB,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Body Measurements (Weight, Body Fat)
CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  body_fat_percent DECIMAL(5,2),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sleep Logs
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_slept DECIMAL(4,2),
  quality INTEGER CHECK (quality BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity Log (Track which days user logged data)
CREATE TABLE IF NOT EXISTS activity_log (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  logged_workout BOOLEAN DEFAULT FALSE,
  logged_nutrition BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, date)
);

-- Create Indexes
CREATE INDEX idx_nutrition_user_date ON nutrition_logs(user_id, date DESC);
CREATE INDEX idx_workout_user_date ON workout_logs(user_id, date DESC);
CREATE INDEX idx_measurements_user_date ON measurements(user_id, date DESC);
CREATE INDEX idx_sleep_user_date ON sleep_logs(user_id, date DESC);
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (All tables follow same pattern)
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own goals"
  ON goals FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own nutrition"
  ON nutrition_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own nutrition"
  ON nutrition_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own workouts"
  ON workout_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own workouts"
  ON workout_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own measurements"
  ON measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own measurements"
  ON measurements FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sleep"
  ON sleep_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sleep"
  ON sleep_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own activity"
  ON activity_log FOR ALL
  USING (auth.uid() = user_id);
