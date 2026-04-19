-- ============================================================
-- BRN LAB — Supabase Database Schema
-- ============================================================


-- ============================================================
-- 1. PROFILES (first, so is_admin() can reference it)
-- ============================================================

CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  phone             TEXT,
  birthday          DATE,
  injuries          TEXT,
  emergency_name    TEXT,
  emergency_phone   TEXT,
  class_balance     INTEGER NOT NULL DEFAULT 0,
  classes_taken     INTEGER NOT NULL DEFAULT 0,
  is_admin          BOOLEAN NOT NULL DEFAULT false,
  is_approved       BOOLEAN NOT NULL DEFAULT false,
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 2. HELPER FUNCTION (after profiles exists)
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================
-- 3. PROFILES RLS
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (is_admin());


-- ============================================================
-- 4. CLASSES
-- ============================================================

CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  time        TIME NOT NULL,
  class_name  TEXT NOT NULL,
  coach_name  TEXT NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 8,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_date ON classes(date);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view classes"
  ON classes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert classes"
  ON classes FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update classes"
  ON classes FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete classes"
  ON classes FOR DELETE USING (is_admin());


-- ============================================================
-- 5. CLASS TEMPLATES
-- ============================================================

CREATE TABLE class_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time          TIME NOT NULL,
  class_name    TEXT NOT NULL,
  coach_name    TEXT NOT NULL,
  capacity      INTEGER NOT NULL DEFAULT 8,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE class_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates"
  ON class_templates FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- 6. PENALTIES (before bookings, trigger references it)
-- ============================================================

CREATE TABLE penalties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('late_cancel', 'late_arrival')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_penalties_user ON penalties(user_id);

ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own penalties"
  ON penalties FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can insert penalties"
  ON penalties FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can delete penalties"
  ON penalties FOR DELETE USING (is_admin());


-- ============================================================
-- 7. BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending')),
  checked_in  BOOLEAN NOT NULL DEFAULT false,
  booked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, class_id)
);

CREATE INDEX idx_bookings_class ON bookings(class_id);
CREATE INDEX idx_bookings_user  ON bookings(user_id);

CREATE OR REPLACE FUNCTION handle_late_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  class_datetime  TIMESTAMPTZ;
  hours_remaining NUMERIC;
BEGIN
  SELECT (date + time)::TIMESTAMPTZ
  INTO class_datetime
  FROM classes WHERE id = OLD.class_id;

  hours_remaining := EXTRACT(EPOCH FROM (class_datetime - NOW())) / 3600;

  IF hours_remaining >= 0 AND hours_remaining <= 6 THEN
    INSERT INTO penalties (user_id, class_id, type, notes)
    VALUES (OLD.user_id, OLD.class_id, 'late_cancel',
      'Auto-generated: booking cancelled within 6 hours of class start');
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_booking_delete
  BEFORE DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_late_cancellation();

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can book classes"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own bookings"
  ON bookings FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can update bookings (check-in)"
  ON bookings FOR UPDATE USING (is_admin());


-- ============================================================
-- 8. WAITLIST
-- ============================================================

CREATE TABLE waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, class_id)
);

CREATE INDEX idx_waitlist_class ON waitlist(class_id);
CREATE INDEX idx_waitlist_user  ON waitlist(user_id);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waitlist"
  ON waitlist FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can join waitlist"
  ON waitlist FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave waitlist"
  ON waitlist FOR DELETE
  USING (auth.uid() = user_id OR is_admin());


-- ============================================================
-- 9. UPDATES
-- ============================================================

CREATE TABLE updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'announcement'
                CHECK (category IN ('announcement', 'coach', 'promotion', 'holiday', 'schedule')),
  pinned      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view updates"
  ON updates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert updates"
  ON updates FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update updates"
  ON updates FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete updates"
  ON updates FOR DELETE USING (is_admin());


-- ============================================================
-- 10. STORAGE — Avatar bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
