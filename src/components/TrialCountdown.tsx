import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Crown, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export const TrialCountdown = () => {
  const navigate = useNavigate();
  const { status, trial_active, trial_ends_at, subscribed, loading } = useSubscription();
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!trial_ends_at || !trial_active) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(trial_ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Potekel");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [trial_ends_at, trial_active]);

  if (loading) return null;

  // If subscribed, show active status
  if (subscribed) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
        <Crown className="w-4 h-4 text-green-500" />
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          Pro aktivno
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => navigate("/subscription")}
        >
          Upravljaj
        </Button>
      </div>
    );
  }

  // If trial active, show countdown
  if (status === "trial" && trial_active) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <Clock className="w-4 h-4 text-yellow-500" />
        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
          Trial: {timeLeft}
        </span>
        <Button
          variant="default"
          size="sm"
          className="h-6 px-2 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          onClick={() => navigate("/subscription")}
        >
          <Crown className="w-3 h-3 mr-1" />
          Nadgradi
        </Button>
      </div>
    );
  }

  // If expired
  if (status === "expired") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-lg">
        <Clock className="w-4 h-4 text-destructive" />
        <span className="text-xs font-medium text-destructive">
          Trial potekel
        </span>
        <Button
          variant="destructive"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => navigate("/subscription")}
        >
          <Crown className="w-3 h-3 mr-1" />
          Naroči se
        </Button>
      </div>
    );
  }

  return null;
};
