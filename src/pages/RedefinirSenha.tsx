import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionInvalid, setSessionInvalid] = useState(false);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    let resolved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (resolved) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        resolved = true;
        setSessionReady(true);
      }
    });

    // Check hash for recovery token
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      const checkSession = async () => {
        await new Promise((r) => setTimeout(r, 800));
        if (resolved) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          resolved = true;
          setSessionReady(true);
        } else {
          resolved = true;
          setSessionInvalid(true);
        }
      };
      checkSession();
    } else {
      // No recovery token in URL - check existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (resolved) return;
        if (session) {
          resolved = true;
          setSessionReady(true);
        } else {
          // Wait a bit then mark invalid
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              setSessionInvalid(true);
            }
          }, 2000);
        }
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sign out so user logs in fresh
    await supabase.auth.signOut();

    toast({
      title: "Senha redefinida com sucesso!",
      description: "Agora você pode entrar com sua nova senha.",
    });

    navigate("/login");
  };

  if (sessionInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="pt-8 pb-8 px-8 text-center space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground">Link inválido ou expirado</h2>
            <p className="text-muted-foreground text-sm">
              Solicite um novo link de redefinição de senha.
            </p>
            <Link to="/esqueci-senha">
              <Button variant="outline" className="mt-2 gap-2">
                Solicitar novo link
              </Button>
            </Link>
            <div>
              <Link to="/login" className="text-sm text-primary hover:underline">
                <ArrowLeft className="inline h-3 w-3 mr-1" />
                Voltar ao login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="pt-8 pb-8 px-8 text-center space-y-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Verificando link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-primary mb-2">V</div>
            <h1 className="text-2xl font-semibold text-foreground">Nova senha</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Escolha uma nova senha para sua conta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={passwordMismatch ? "border-destructive" : ""}
              />
              {passwordMismatch && (
                <p className="text-sm text-destructive">As senhas não coincidem.</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading || passwordMismatch}>
              {loading ? <Loader2 className="animate-spin" /> : "Redefinir senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RedefinirSenha;
