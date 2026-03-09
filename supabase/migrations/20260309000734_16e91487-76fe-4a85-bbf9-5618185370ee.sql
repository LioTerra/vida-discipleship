
-- Add new Pulso de Vida columns
ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS seguranca integer,
  ADD COLUMN IF NOT EXISTS seguranca_evidencia text,
  ADD COLUMN IF NOT EXISTS sensibilidade integer,
  ADD COLUMN IF NOT EXISTS sensibilidade_evidencia text,
  ADD COLUMN IF NOT EXISTS capacidade integer,
  ADD COLUMN IF NOT EXISTS capacidade_evidencia text,
  ADD COLUMN IF NOT EXISTS fidelidade integer,
  ADD COLUMN IF NOT EXISTS fidelidade_evidencia text,
  ADD COLUMN IF NOT EXISTS influencia integer,
  ADD COLUMN IF NOT EXISTS influencia_evidencia text,
  ADD COLUMN IF NOT EXISTS vitoria_semana text,
  ADD COLUMN IF NOT EXISTS desafio_semana text,
  ADD COLUMN IF NOT EXISTS pedido_oracao text;

-- Drop old validation trigger
DROP TRIGGER IF EXISTS validate_avaliacao_scores_trigger ON public.avaliacoes;

-- Replace validation function for 0-10 scale
CREATE OR REPLACE FUNCTION public.validate_avaliacao_scores()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate new 0-10 columns
  IF NEW.seguranca IS NOT NULL AND (NEW.seguranca < 0 OR NEW.seguranca > 10) THEN
    RAISE EXCEPTION 'seguranca must be between 0 and 10';
  END IF;
  IF NEW.sensibilidade IS NOT NULL AND (NEW.sensibilidade < 0 OR NEW.sensibilidade > 10) THEN
    RAISE EXCEPTION 'sensibilidade must be between 0 and 10';
  END IF;
  IF NEW.capacidade IS NOT NULL AND (NEW.capacidade < 0 OR NEW.capacidade > 10) THEN
    RAISE EXCEPTION 'capacidade must be between 0 and 10';
  END IF;
  IF NEW.fidelidade IS NOT NULL AND (NEW.fidelidade < 0 OR NEW.fidelidade > 10) THEN
    RAISE EXCEPTION 'fidelidade must be between 0 and 10';
  END IF;
  IF NEW.influencia IS NOT NULL AND (NEW.influencia < 0 OR NEW.influencia > 10) THEN
    RAISE EXCEPTION 'influencia must be between 0 and 10';
  END IF;
  -- Keep old validations for backward compat
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
$function$;

-- Recreate trigger
CREATE TRIGGER validate_avaliacao_scores_trigger
  BEFORE INSERT OR UPDATE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.validate_avaliacao_scores();
