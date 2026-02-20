import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const Configuracoes = () => {
  const { profile } = useAuth();

  if (profile?.role !== "admin") {
    return <Navigate to="/app/inicio" replace />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Card>
        <CardContent className="py-12 text-center">
          <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Configurações do sistema — em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;
