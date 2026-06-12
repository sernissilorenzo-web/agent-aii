-- ============================================
--  AGENTE AI – Schema Database Supabase
--  Vai su Supabase → SQL Editor → incolla tutto → Run
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Codici di invito
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'start',
  used BOOLEAN DEFAULT false,
  used_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Utenti
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'start',
  invite_code TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurazione assistente
CREATE TABLE IF NOT EXISTS assistants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#22c55e',
  sector TEXT,
  whatsapp_number TEXT,
  email TEXT,
  voice_name TEXT DEFAULT 'Sofia',
  voice_pitch FLOAT DEFAULT 1.2,
  opening_hours JSONB,
  system_prompt TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documenti Cervello AI
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversazioni WhatsApp
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messaggi
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prenotazioni
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'confirmed',
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statistiche giornaliere
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_count INT DEFAULT 0,
  bookings_count INT DEFAULT 0,
  calls_count INT DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Codici demo iniziali
INSERT INTO invite_codes (code, plan) VALUES
  ('DEMO2024',  'start'),
  ('PROVA001',  'start'),
  ('PRO-TEST',  'pro'),
  ('ADV-TEST',  'advanced')
ON CONFLICT (code) DO NOTHING;

-- Indici
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(user_id, date);
