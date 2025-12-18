import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown } from "lucide-react";

export const SubscriptionBanner = () => {
  const navigate = useNavigate();
  const { status, subscribed, loading } = useSubscription();

  if (loading || subscribed) return null;

  // Show expired overlay only - warning info is now in toolbar
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
