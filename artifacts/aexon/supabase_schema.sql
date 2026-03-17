-- ============================================================
-- AEXON ENDOSCOPY — Supabase SQL Schema
-- Jalankan di Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. TABEL PROFIL PENGGUNA (DOKTER / ADMIN)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  specialization TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'doctor' CHECK (role IN ('doctor', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  avatar TEXT DEFAULT '',
  str_number TEXT DEFAULT '',
  sip_number TEXT DEFAULT '',
  enterprise_id UUID DEFAULT NULL,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  name_change_requested BOOLEAN DEFAULT FALSE,
  last_name_change_date TIMESTAMPTZ DEFAULT NULL,
  preferences JSONB DEFAULT '{"fontSize": "normal"}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS untuk profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all profiles in enterprise"
  ON profiles FOR SELECT
  USING (
    enterprise_id IS NOT NULL
    AND enterprise_id = (SELECT enterprise_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update profiles in enterprise"
  ON profiles FOR UPDATE
  USING (
    enterprise_id IS NOT NULL
    AND enterprise_id = (SELECT enterprise_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- 2. TABEL ENTERPRISE / INSTITUSI
CREATE TABLE IF NOT EXISTS enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('active', 'trial', 'expired')),
  subscription_plan TEXT DEFAULT 'monthly' CHECK (subscription_plan IN ('monthly', 'yearly')),
  max_seats INTEGER DEFAULT 5,
  subscription_expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read own enterprise"
  ON enterprises FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND enterprise_id = enterprises.id AND role = 'admin')
  );

CREATE POLICY "Admin can update own enterprise"
  ON enterprises FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND enterprise_id = enterprises.id AND role = 'admin')
  );


-- 3. TABEL KOP SURAT (HOSPITAL SETTINGS)
CREATE TABLE IF NOT EXISTS hospital_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id UUID DEFAULT NULL REFERENCES enterprises(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  fax TEXT DEFAULT '',
  website TEXT DEFAULT '',
  email TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  subscription_status TEXT DEFAULT 'trial',
  last_name_changed TIMESTAMPTZ DEFAULT NULL,
  last_logo_changed TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hospital_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own hospital settings"
  ON hospital_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hospital settings"
  ON hospital_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hospital settings"
  ON hospital_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hospital settings"
  ON hospital_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Enterprise members can read enterprise hospital settings"
  ON hospital_settings FOR SELECT
  USING (
    enterprise_id IS NOT NULL
    AND enterprise_id = (SELECT enterprise_id FROM profiles WHERE id = auth.uid())
  );


-- 4. TABEL SESI ENDOSKOPI
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  clinical_notes TEXT DEFAULT '',
  patient_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);


-- 5. TABEL CAPTURES (FOTO & VIDEO)
CREATE TABLE IF NOT EXISTS captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  original_url TEXT DEFAULT NULL,
  caption TEXT DEFAULT '',
  shapes JSONB DEFAULT '[]'::JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own captures"
  ON captures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own captures"
  ON captures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own captures"
  ON captures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own captures"
  ON captures FOR DELETE
  USING (auth.uid() = user_id);


-- 6. TABEL SUBSCRIPTIONS (LANGGANAN XENDIT)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id UUID DEFAULT NULL REFERENCES enterprises(id) ON DELETE SET NULL,
  plan TEXT NOT NULL CHECK (plan IN ('subscription', 'enterprise')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  xendit_invoice_id TEXT DEFAULT NULL,
  xendit_payment_url TEXT DEFAULT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  starts_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);


-- 7. STORAGE BUCKET UNTUK MEDIA (FOTO/VIDEO/LOGO)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aexon-media',
  'aexon-media',
  FALSE,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/webm', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'aexon-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can read own media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aexon-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'aexon-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );


-- 8. FUNCTION: AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'doctor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 9. FUNCTION: AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER hospital_settings_updated_at
  BEFORE UPDATE ON hospital_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER enterprises_updated_at
  BEFORE UPDATE ON enterprises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 10. INDEXES UNTUK PERFORMA
CREATE INDEX IF NOT EXISTS idx_profiles_enterprise ON profiles(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_captures_session ON captures(session_id);
CREATE INDEX IF NOT EXISTS idx_captures_user ON captures(user_id);
CREATE INDEX IF NOT EXISTS idx_hospital_settings_user ON hospital_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
