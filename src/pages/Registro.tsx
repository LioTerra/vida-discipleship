import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle } from "lucide-react";
import { translateAuthError } from "@/lib/translateAuthError";

const Registro = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, telefone },
        emailRedirectTo: window.location.origin + "/login",
      },
    });

    if (authError) {
      setError(translateAuthError(authError.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="pt-8 pb-8 px-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Cadastro realizado!</h2>
            <p className="text-muted-foreground text-sm">
              Aguarde a liberação do seu acesso pelo administrador.
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-6">
                Voltar ao login
              </Button>
            </Link>
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
            <h1 className="text-2xl font-semibold text-foreground">Criar Conta</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Preencha seus dados para se cadastrar
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
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
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Cadastrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link to="/esqueci-senha" className="text-primary hover:underline">
              Esqueceu sua senha?
            </Link>
          </p>

          <p className="text-center text-sm text-muted-foreground mt-2">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Fazer login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Registro;
