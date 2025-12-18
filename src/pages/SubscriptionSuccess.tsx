import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { checkSubscription, subscribed } = useSubscription();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Refresh subscription status
    checkSubscription();
  }, [checkSubscription]);

  // Auto-redirect countdown
  useEffect(() => {
    if (!subscribed) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [subscribed, navigate]);

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
        {subscribed && (
          <p className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preusmeritev čez {countdown} sekund...
          </p>
        )}
        <Button onClick={() => navigate("/")} size="lg">
          Začni z uporabo
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
