import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, ArrowLeft, Tag } from "lucide-react";

const emailSchema = z.string().trim().email({ message: "Neveljaven email naslov" });
const passwordSchema = z.string().min(6, { message: "Geslo mora imeti vsaj 6 znakov" });

const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

type AuthMode = "login" | "register" | "forgot" | "reset" | "check-email";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if this is a password reset callback from URL params or hash
    const type = searchParams.get("type");
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashType = hashParams.get("type");
    
    if (type === "recovery" || hashType === "recovery") {
      setMode("reset");
    }
  }, [searchParams]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event, "Mode:", mode);
        
        // Check URL for recovery type
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashType = hashParams.get("type");
        const urlType = searchParams.get("type");
        const isRecovery = hashType === "recovery" || urlType === "recovery";
        
        if (isRecovery) {
          setMode("reset");
          return; // Don't redirect on password recovery
        }
        
        // Only redirect to home if not in reset mode
        if (session?.user && mode !== "reset") {
          navigate("/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check URL params to see if this is a recovery flow
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashType = hashParams.get("type");
      const urlType = searchParams.get("type");
      
      if (hashType === "recovery" || urlType === "recovery") {
        setMode("reset");
        return;
      }
      
      if (session?.user && mode !== "reset") {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, mode, searchParams]);

  const validateForm = () => {
    if (mode === "forgot") {
      const result = emailSchema.safeParse(email);
      if (!result.success) {
        setErrors({ email: result.error.errors[0].message });
        return false;
      }
      setErrors({});
      return true;
    }

    if (mode === "reset") {
      const result = passwordSchema.safeParse(password);
      if (!result.success) {
        setErrors({ password: result.error.errors[0].message });
        return false;
      }
      if (password !== confirmPassword) {
        setErrors({ confirmPassword: "Gesli se ne ujemata" });
        return false;
      }
      setErrors({});
      return true;
    }

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) {
        toast({
          title: "Napaka",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Email poslan",
        description: "Preveri svoj email za povezavo za ponastavitev gesla.",
      });
      setMode("login");
    } catch (error) {
      toast({
        title: "Napaka",
        description: "Nekaj je šlo narobe. Poskusi znova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: "Napaka",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Geslo posodobljeno",
        description: "Geslo je bilo uspešno spremenjeno.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Napaka",
        description: "Nekaj je šlo narobe. Poskusi znova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "forgot") {
      await handleForgotPassword();
      return;
    }

    if (mode === "reset") {
      await handleResetPassword();
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Napaka pri prijavi",
              description: "Napačen email ali geslo",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Napaka",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        toast({
          title: "Uspešna prijava",
          description: "Dobrodošli nazaj!",
        });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Napaka",
              description: "Ta email je že registriran. Poskusi se prijaviti.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Napaka",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        setMode("check-email");
      }
    } catch (error) {
      toast({
        title: "Napaka",
        description: "Nekaj je šlo narobe. Poskusi znova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "Prijava";
      case "register": return "Registracija";
      case "forgot": return "Pozabljeno geslo";
      case "reset": return "Novo geslo";
      case "check-email": return "Preveri email";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login": return "Vpiši svoje podatke za prijavo";
      case "register": return "Ustvari nov račun";
      case "forgot": return "Vpiši email za ponastavitev gesla";
      case "reset": return "Vpiši novo geslo";
      case "check-email": return "";
    }
  };

  // Full-page check email screen
  if (mode === "check-email") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Preveri svoj email</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Poslali smo ti potrditveno sporočilo na <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="text-muted-foreground mb-8">
            Klikni na povezavo v emailu, da potrdiš svoj račun in se lahko prijaviš.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setMode("login");
              setEmail("");
              setPassword("");
            }}
          >
            Nazaj na prijavo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Tag className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Label Designer</h1>
        <p className="text-muted-foreground mt-2">Ustvari profesionalne etikete</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center relative">
          {(mode === "forgot" || mode === "reset") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("login")}
              className="absolute left-4 top-4"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Nazaj
            </Button>
          )}
          <CardTitle className="text-2xl font-bold">
            {getTitle()}
          </CardTitle>
          <CardDescription>
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ime@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <div className="space-y-2">
                <Label htmlFor="password">{mode === "reset" ? "Novo geslo" : "Geslo"}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            {mode === "reset" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potrdi geslo</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" && "Prijava"}
              {mode === "register" && "Registracija"}
              {mode === "forgot" && "Pošlji email"}
              {mode === "reset" && "Shrani geslo"}
            </Button>
          </form>

          {mode === "login" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
                disabled={loading}
              >
                Pozabljeno geslo?
              </button>
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                {mode === "login" ? "Nimaš računa? " : "Že imaš račun? "}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setErrors({});
                }}
                className="text-primary hover:underline font-medium"
                disabled={loading}
              >
                {mode === "login" ? "Registriraj se" : "Prijavi se"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
