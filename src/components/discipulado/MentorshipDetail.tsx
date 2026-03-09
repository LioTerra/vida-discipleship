import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvaliacaoForm from "./AvaliacaoForm";
import AvaliacaoHistorico from "./AvaliacaoHistorico";
import PulsoDeVidaRadar from "./PulsoDeVidaRadar";

interface MentorshipDetailProps {
  mentorship: any;
  onBack: () => void;
}

export default function MentorshipDetail({ mentorship, onBack }: MentorshipDetailProps) {
  const { user } = useAuth();
  const isMentor = mentorship.mentor_id === user?.id;
  const otherName = isMentor
    ? mentorship.mentee?.nome
    : mentorship.mentor?.nome;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {otherName?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p>{otherName}</p>
              <p className="text-sm font-normal text-muted-foreground">
                {isMentor ? "Seu mentorado" : "Seu mentor"}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 text-sm text-muted-foreground">
          <span>
            Status: <span className="text-primary capitalize">{mentorship.status}</span>
          </span>
          {mentorship.started_at && (
            <span>
              Início: {new Date(mentorship.started_at).toLocaleDateString("pt-BR")}
            </span>
          )}
        </CardContent>
      </Card>

      <PulsoDeVidaRadar mentorshipId={mentorship.id} />

      <div className={`grid gap-6 ${!isMentor ? "lg:grid-cols-2" : ""}`}>
        {!isMentor && <AvaliacaoForm mentorshipId={mentorship.id} />}
        <AvaliacaoHistorico mentorshipId={mentorship.id} />
      </div>
    </div>
  );
}
