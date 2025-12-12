# Navodila za deploy Edge funkcij na lasten Supabase strežnik

Ta dokument opisuje, kako deploiaš edge funkcije iz tega projekta na tvoj lasten Supabase strežnik (npr. `database.perko-tehtnice.si`).

## Predpogoji

1. **Supabase CLI** - namesti Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. **Prijava v Supabase** - prijavi se v svoj Supabase račun:
   ```bash
   supabase login
   ```

3. **Project Reference** - pridobi svoj project ref iz Supabase dashboarda:
   - Pojdi na https://supabase.com/dashboard
   - Izberi svoj projekt
   - V URL boš videl: `https://supabase.com/dashboard/project/TVOJ_PROJECT_REF`

## 1. Nastavitev Secrets

Najprej moraš nastaviti vse potrebne secrets na tvojem Supabase strežniku:

```bash
# Zamenjaj TVOJ_PROJECT_REF s tvojim dejanskim project reference
# Zamenjaj vrednosti s tvojimi dejanskimi ključi

supabase secrets set STRIPE_SECRET_KEY=sk_live_TVOJ_STRIPE_KEY --project-ref TVOJ_PROJECT_REF
```

### Potrebni secrets:

| Secret Name | Opis | Kje ga dobiš |
|-------------|------|--------------|
| `STRIPE_SECRET_KEY` | Stripe API ključ | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |

**Opomba:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` in `SUPABASE_SERVICE_ROLE_KEY` so avtomatsko na voljo v edge funkcijah.

## 2. Deploy Edge funkcij

Iz root direktorija projekta poženi naslednje ukaze:

```bash
# Nastavi project ref
export SUPABASE_PROJECT_REF=TVOJ_PROJECT_REF

# Deploy vse edge funkcije
supabase functions deploy check-subscription --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy check-fingerprint --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy register-fingerprint --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy create-checkout --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy customer-portal --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy print-zpl --project-ref $SUPABASE_PROJECT_REF
```

### Batch deploy (vse naenkrat):

```bash
# Ustvari deploy script
cat > deploy-functions.sh << 'EOF'
#!/bin/bash

PROJECT_REF=${1:-$SUPABASE_PROJECT_REF}

if [ -z "$PROJECT_REF" ]; then
    echo "Uporaba: ./deploy-functions.sh TVOJ_PROJECT_REF"
    exit 1
fi

FUNCTIONS=(
    "check-subscription"
    "check-fingerprint"
    "register-fingerprint"
    "create-checkout"
    "customer-portal"
    "print-zpl"
)

for func in "${FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    supabase functions deploy $func --project-ref $PROJECT_REF
    if [ $? -ne 0 ]; then
        echo "Napaka pri deploy $func"
        exit 1
    fi
done

echo "Vse funkcije uspešno deploiane!"
EOF

chmod +x deploy-functions.sh

# Poženi deploy
./deploy-functions.sh TVOJ_PROJECT_REF
```

## 3. Preverjanje funkcij

Po deployu preveri, da funkcije delujejo:

```bash
# Preveri status funkcij
supabase functions list --project-ref TVOJ_PROJECT_REF

# Preveri loge za posamezno funkcijo
supabase functions logs check-subscription --project-ref TVOJ_PROJECT_REF
```

### Test klica funkcije:

```bash
# Test check-subscription (potrebuje JWT token)
curl -X POST \
  'https://TVOJ_PROJECT_REF.supabase.co/functions/v1/check-subscription' \
  -H 'Authorization: Bearer UPORABNIKOV_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

## 4. Konfiguracija aplikacije

Poskrbi, da ima tvoja lokalna `.env` datoteka pravilne vrednosti:

```env
VITE_SUPABASE_URL=https://database.perko-tehtnice.si
VITE_SUPABASE_PUBLISHABLE_KEY=tvoj_anon_key
VITE_SUPABASE_PROJECT_ID=tvoj_project_id
VITE_PRINT_RELAY_URL=http://localhost:8080
```

## 5. Database setup

Če še nimaš potrebnih tabel, moraš izvesti migracije:

```bash
# Poveži se na svoj projekt
supabase link --project-ref TVOJ_PROJECT_REF

# Izvedi migracije
supabase db push
```

### Potrebne tabele:

1. **user_subscriptions** - za sledenje naročnin
2. **device_fingerprints** - za anti-abuse sistem
3. **labels** - za shranjevanje etiket

## 6. Stripe konfiguracija

### 6.1 Ustvari produkt in ceno v Stripe

1. Pojdi na [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Ustvari nov produkt (npr. "Label Designer Pro")
3. Dodaj ceno (npr. 9.99€/mesec)
4. Kopiraj `price_id` (npr. `price_1ABC123...`)

### 6.2 Posodobi edge funkcijo

V datoteki `supabase/functions/create-checkout/index.ts` posodobi `PRICE_ID`:

```typescript
const PRICE_ID = "price_TVOJ_PRICE_ID"; // Zamenjaj s tvojim
```

### 6.3 Stripe Customer Portal

Aktiviraj Customer Portal v Stripe:
1. Pojdi na [Stripe Customer Portal Settings](https://dashboard.stripe.com/settings/billing/portal)
2. Omogoči portal
3. Konfiguriraj dovoljene akcije

## 7. Reševanje težav

### Napaka: "STRIPE_SECRET_KEY is not set"

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx --project-ref TVOJ_PROJECT_REF
```

### Napaka: "Authentication error"

Preveri, da:
- Uporabnik ima veljaven JWT token
- `SUPABASE_SERVICE_ROLE_KEY` je pravilno nastavljen

### Napaka: 500 Internal Server Error

Preveri loge:
```bash
supabase functions logs check-subscription --project-ref TVOJ_PROJECT_REF --tail
```

### Funkcija ne vrne podatkov

Preveri, da:
- Tabela `user_subscriptions` obstaja
- RLS politike so pravilno nastavljene
- Uporabnik ima zapis v `user_subscriptions`

## 8. Posodabljanje funkcij

Ko posodobiš kodo funkcije, jo ponovno deploiaj:

```bash
supabase functions deploy FUNCTION_NAME --project-ref TVOJ_PROJECT_REF
```

## Podpora

Če imaš težave, preveri:
1. Supabase dashboard za status projekta
2. Edge function loge za napake
3. Network tab v brskalniku za HTTP napake

---

*Zadnja posodobitev: December 2024*
