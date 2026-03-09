import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 600;

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLockedOut = lockoutRemaining > 0;

  const startLockout = useCallback(() => {
    setLockoutRemaining(LOCKOUT_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        startLockout();
        setError(`Muitas tentativas. Aguarde ${formatTime(LOCKOUT_SECONDS)} para tentar novamente.`);
      } else {
        setError(`Email ou senha inválidos. (${newAttempts}/${MAX_ATTEMPTS})`);
      }

      setLoading(false);
      return;
    }

    setFailedAttempts(0);
    setLockoutRemaining(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    navigate("/app/inicio");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-primary mb-2">V</div>
            <h1 className="text-2xl font-semibold text-foreground">Ministério Vida</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Transformando Famílias, Formando Discípulos, Alcançando Nações.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLockedOut && (
              <Alert>
                <AlertDescription>
                  Aguarde {formatTime(lockoutRemaining)} para tentar novamente.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLockedOut}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLockedOut}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || isLockedOut}>
              {loading ? <Loader2 className="animate-spin" /> : isLockedOut ? `Bloqueado (${formatTime(lockoutRemaining)})` : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link to="/esqueci-senha" className="text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </p>

          <p className="text-center text-sm text-muted-foreground mt-2">
            Não tem conta?{" "}
            <Link to="/registro" className="text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
