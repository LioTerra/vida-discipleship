import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!tokenHash || !type) {
      setError(true);
      return;
    }

    const verify = async () => {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "recovery" | "email" | "signup",
      });

      if (error) {
        setError(true);
        return;
      }

      if (type === "recovery") {
        navigate("/reset-password", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    };

    verify();
  }, [searchParams, navigate]);

  if (error) {
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border">
        <CardContent className="pt-8 pb-8 px-8 text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verificando...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthConfirm;
