
-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'user');
CREATE TYPE content_type AS ENUM ('video', 'audio', 'texto');
CREATE TYPE mentorship_status AS ENUM ('ativo', 'pausado', 'concluido');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  role user_role DEFAULT 'user',
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can update own profile but NOT role or ativo
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (including role and ativo)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger to prevent users from changing their own role/ativo
CREATE OR REPLACE FUNCTION public.prevent_role_ativo_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id = auth.uid() THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      NEW.role := OLD.role;
    END IF;
    IF OLD.ativo IS DISTINCT FROM NEW.ativo THEN
      NEW.ativo := OLD.ativo;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_self_role_ativo_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_ativo_self_update();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- MENTORSHIPS
CREATE TABLE public.mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status mentorship_status DEFAULT 'ativo',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read own mentorships"
  ON public.mentorships FOR SELECT
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY "Staff/admin can read all mentorships"
  ON public.mentorships FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- CURSOS
CREATE TABLE public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cursos"
  ON public.cursos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Staff/admin can insert cursos"
  ON public.cursos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff/admin can update cursos"
  ON public.cursos FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE TRIGGER update_cursos_updated_at
  BEFORE UPDATE ON public.cursos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- MODULOS
CREATE TABLE public.modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read modulos"
  ON public.modulos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Staff/admin can insert modulos"
  ON public.modulos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff/admin can update modulos"
  ON public.modulos FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- AULAS
CREATE TABLE public.aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo content_type NOT NULL,
  url TEXT,
  conteudo_texto TEXT,
  duracao_min INT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read aulas"
  ON public.aulas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Staff/admin can insert aulas"
  ON public.aulas FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff/admin can update aulas"
  ON public.aulas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- PROGRESSO
CREATE TABLE public.progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  concluido BOOLEAN DEFAULT false,
  concluido_at TIMESTAMPTZ,
  UNIQUE(user_id, aula_id)
);

ALTER TABLE public.progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progresso"
  ON public.progresso FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progresso"
  ON public.progresso FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progresso"
  ON public.progresso FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff/admin can read all progresso"
  ON public.progresso FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- AVALIACOES
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  semana DATE NOT NULL,
  devocional INT,
  oracao INT,
  comunhao INT,
  evangelismo INT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorship participants can read avaliacoes"
  ON public.avaliacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentorships
      WHERE id = mentorship_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    )
  );

CREATE POLICY "Mentorship participants can insert avaliacoes"
  ON public.avaliacoes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mentorships
      WHERE id = mentorship_id AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    )
  );

CREATE POLICY "Admin can read all avaliacoes"
  ON public.avaliacoes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Validation trigger for avaliacoes scores (1-5)
CREATE OR REPLACE FUNCTION public.validate_avaliacao_scores()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.devocional IS NOT NULL AND (NEW.devocional < 1 OR NEW.devocional > 5) THEN
    RAISE EXCEPTION 'devocional must be between 1 and 5';
  END IF;
  IF NEW.oracao IS NOT NULL AND (NEW.oracao < 1 OR NEW.oracao > 5) THEN
    RAISE EXCEPTION 'oracao must be between 1 and 5';
  END IF;
  IF NEW.comunhao IS NOT NULL AND (NEW.comunhao < 1 OR NEW.comunhao > 5) THEN
    RAISE EXCEPTION 'comunhao must be between 1 and 5';
  END IF;
  IF NEW.evangelismo IS NOT NULL AND (NEW.evangelismo < 1 OR NEW.evangelismo > 5) THEN
    RAISE EXCEPTION 'evangelismo must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_avaliacao_scores_trigger
  BEFORE INSERT OR UPDATE ON public.avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_avaliacao_scores();
