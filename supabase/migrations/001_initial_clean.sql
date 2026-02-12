CREATE TYPE poll_type AS ENUM ('single', 'multiple');
CREATE TYPE poll_status AS ENUM ('active', 'closed', 'moderated');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE voter_tier AS ENUM ('basic', 'verified');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  voter_tier voter_tier NOT NULL DEFAULT 'basic',
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type poll_type NOT NULL DEFAULT 'single',
  status poll_status NOT NULL DEFAULT 'active',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  require_verified BOOLEAN NOT NULL DEFAULT FALSE,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  vote_count INT NOT NULL DEFAULT 0
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, poll_id)
);

CREATE TABLE vote_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  age_range TEXT NOT NULL DEFAULT 'unspecified',
  gender TEXT NOT NULL DEFAULT 'unspecified',
  country TEXT NOT NULL DEFAULT 'unspecified',
  count INT NOT NULL DEFAULT 1,
  UNIQUE(poll_id, option_id, age_range, gender, country)
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vote_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_featured ON polls(featured) WHERE featured = TRUE;
CREATE INDEX idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_options_poll_id ON options(poll_id);
CREATE INDEX idx_vote_demographics_poll ON vote_demographics(poll_id);

CREATE OR REPLACE FUNCTION cast_vote_with_demographics(
  p_user_id UUID,
  p_poll_id UUID,
  p_option_id UUID,
  p_age_range TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_poll_status poll_status;
  v_poll_type poll_type;
  v_require_verified BOOLEAN;
  v_voter_tier voter_tier;
BEGIN
  SELECT status, type, require_verified INTO v_poll_status, v_poll_type, v_require_verified
  FROM polls WHERE id = p_poll_id;

  IF v_poll_status != 'active' THEN
    RAISE EXCEPTION 'Poll is not active';
  END IF;

  IF v_require_verified THEN
    SELECT voter_tier INTO v_voter_tier FROM profiles WHERE id = p_user_id;
    IF v_voter_tier != 'verified' THEN
      RAISE EXCEPTION 'This poll requires verified voters';
    END IF;
  END IF;

  INSERT INTO votes (user_id, poll_id, option_id)
  VALUES (p_user_id, p_poll_id, p_option_id);

  UPDATE options SET vote_count = vote_count + 1 WHERE id = p_option_id;

  IF p_age_range IS NOT NULL OR p_gender IS NOT NULL OR p_country IS NOT NULL THEN
    INSERT INTO vote_demographics (poll_id, option_id, age_range, gender, country, count)
    VALUES (
      p_poll_id,
      p_option_id,
      COALESCE(p_age_range, 'unspecified'),
      COALESCE(p_gender, 'unspecified'),
      COALESCE(p_country, 'unspecified'),
      1
    )
    ON CONFLICT (poll_id, option_id, age_range, gender, country)
    DO UPDATE SET count = vote_demographics.count + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Polls are viewable by everyone"
  ON polls FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create polls"
  ON polls FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own polls"
  ON polls FOR UPDATE USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Options are viewable by everyone"
  ON options FOR SELECT USING (true);
CREATE POLICY "Poll creators can add options"
  ON options FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM polls WHERE id = poll_id AND creator_id = auth.uid())
  );

CREATE POLICY "Users can see own votes"
  ON votes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read demographic tallies"
  ON vote_demographics FOR SELECT USING (true);

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports"
  ON reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view anomalies"
  ON vote_anomalies FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
