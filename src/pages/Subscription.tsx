import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { Check, Loader2, Crown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { 
    status, 
    trial_active, 
    days_remaining, 
    subscribed,
    loading,
    createCheckout,
    openCustomerPortal 
  } = useSubscription();

  const handleSubscribe = async () => {
    try {
      await createCheckout();
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Napaka pri ustvarjanju plačilne seje");
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error("Napaka pri odpiranju portala");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Naročnina</h1>
          <p className="text-muted-foreground mt-2">Izberi načrt za uporabo aplikacije</p>
        </div>

        {/* Trial/Subscription Status Banner */}
        {status === "trial" && trial_active && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-600 dark:text-yellow-400">
                Brezplačen preizkus: še {days_remaining} {days_remaining === 1 ? "dan" : "dni"}
              </p>
              <p className="text-sm text-muted-foreground">
                Po poteku preizkusa boš potreboval naročnino za uporabo aplikacije.
              </p>
            </div>
          </div>
        )}

        {status === "expired" && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Preizkus je potekel</p>
              <p className="text-sm text-muted-foreground">
                Za nadaljevanje uporabe aplikacije se naroči.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Card */}
        <Card className={`shadow-xl border-2 ${subscribed ? "border-primary" : "border-border/50"}`}>
          <CardHeader className="text-center pb-2">
            {subscribed && (
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                Aktivno
              </div>
            )}
            <CardTitle className="text-2xl">Pro naročnina</CardTitle>
            <CardDescription>Vsi dostop do vseh funkcij</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-5xl font-bold">9.99€</span>
              <span className="text-muted-foreground">/mesec</span>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Neomejeno ustvarjanje etiket</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Shranjevanje v oblak</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Izvoz v ZPL format</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Tiskanje na Zebra tiskalnike</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Vsi tipi črtnih kod in QR kod</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Prednostna podpora</span>
              </li>
            </ul>

            <div className="pt-4 space-y-3">
              {subscribed ? (
                <Button 
                  onClick={handleManageSubscription} 
                  variant="outline" 
                  className="w-full"
                >
                  Upravljaj naročnino
                </Button>
              ) : (
                <Button onClick={handleSubscribe} className="w-full" size="lg">
                  Naroči se zdaj
                </Button>
              )}

              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => navigate("/")}
              >
                Nazaj na aplikacijo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* FAQ or additional info */}
        <p className="text-center text-sm text-muted-foreground">
          Naročnino lahko kadarkoli prekličeš. Varen plačilni sistem Stripe.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPage;
