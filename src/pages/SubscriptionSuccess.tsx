import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();

  useEffect(() => {
    // Refresh subscription status
    checkSubscription();
  }, [checkSubscription]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Naročnina aktivirana!</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Hvala za naročnino. Zdaj imaš poln dostop do vseh funkcij aplikacije.
        </p>
        <Button onClick={() => navigate("/")} size="lg">
          Začni z uporabo
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
