import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown, X } from "lucide-react";
import { useState } from "react";

export const SubscriptionBanner = () => {
  const navigate = useNavigate();
  const { status, trial_active, days_remaining, subscribed, loading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (loading || subscribed || dismissed) return null;

  // Show warning banner when trial is running low (7 days or less)
  if (status === "trial" && trial_active && days_remaining <= 7) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-yellow-950 px-4 py-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Brezplačen preizkus poteče čez {days_remaining} {days_remaining === 1 ? "dan" : "dni"}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 bg-yellow-950 text-yellow-50 hover:bg-yellow-900"
              onClick={() => navigate("/subscription")}
            >
              <Crown className="h-3 w-3 mr-1" />
              Naroči se
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-yellow-600/50 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show expired banner
  if (status === "expired") {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="max-w-md mx-4 text-center space-y-6 p-8 bg-card rounded-lg border shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Preizkus je potekel</h2>
            <p className="text-muted-foreground">
              Tvoj 14-dnevni brezplačni preizkus je potekel. Za nadaljevanje uporabe aplikacije se naroči.
            </p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => navigate("/subscription")} size="lg" className="w-full">
              <Crown className="h-4 w-4 mr-2" />
              Poglej naročnino
            </Button>
            <p className="text-xs text-muted-foreground">
              Še vedno lahko vidiš svoje obstoječe etikete, a ne moreš ustvarjati novih ali tiskati.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
