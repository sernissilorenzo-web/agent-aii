# 🤖 Agente AI – Guida di Setup Completa

Segui questi passi nell'ordine esatto. Ogni passo ha un link e spiega cosa fare.

---

## PASSO 1 — Crea l'account Supabase (5 minuti)

1. Vai su https://supabase.com → clicca **Start for free**
2. Registrati con GitHub o email
3. Clicca **New Project**
4. Dai un nome tipo `agente-ai` e scegli una password
5. Scegli la regione **West Europe**
6. Aspetta 1-2 minuti che il progetto si crea

Poi vai su **Settings → API** e copia:
- `Project URL` → es. `https://xxxx.supabase.co`
- `anon public key` → una stringa lunga

Apri il file `.env` in questo progetto e incolla i valori.

---

## PASSO 2 — Crea le tabelle nel database (3 minuti)

1. In Supabase vai su **SQL Editor**
2. Copia tutto il contenuto del file `supabase/schema.sql`
3. Incollalo nell'editor e clicca **Run**
4. Dovresti vedere "Success" verde

---

## PASSO 3 — Crea l'account Vercel (5 minuti)

1. Vai su https://vercel.com → registrati con GitHub
2. Clicca **Add New Project**
3. Carica la cartella di questo progetto
4. Nella sezione **Environment Variables** aggiungi le variabili del file `.env`
5. Clicca **Deploy**

Il tuo sito sarà online su un link tipo `agente-ai.vercel.app`

---

## PASSO 4 — Collega Claude AI (10 minuti)

1. Vai su https://console.anthropic.com
2. Registrati → vai su **API Keys** → crea una chiave
3. Copia la chiave e mettila nel file `.env` come `ANTHROPIC_API_KEY`

---

## PASSO 5 — WhatsApp Business API (1-2 giorni per la verifica Meta)

1. Vai su https://developers.facebook.com
2. Crea un'app di tipo **Business**
3. Aggiungi il prodotto **WhatsApp**
4. Segui la verifica del numero
5. Copia il token e mettilo nel file `.env`

---

## PASSO 6 — Twilio per le chiamate (30 minuti)

1. Vai su https://twilio.com → registrati
2. Compra un numero italiano
3. Copia `Account SID` e `Auth Token` nel file `.env`

---

## PASSO 7 — Stripe per i pagamenti (1 ora)

1. Vai su https://stripe.com → registrati
2. Vai su **Products** → crea 3 prodotti:
   - Start €49/mese
   - Pro €99/mese  
   - Advanced €199/mese
3. Copia le `price_id` di ogni piano nel file `.env`
4. Copia la `secret key` nel file `.env`

---

## File del progetto

```
agente-ai-backend/
├── README.md              ← questa guida
├── .env.example           ← variabili da compilare
├── package.json           ← dipendenze Node.js
├── server.js              ← server principale
├── supabase/
│   └── schema.sql         ← tabelle del database
├── routes/
│   ├── auth.js            ← login, registrazione, codici invito
│   ├── assistant.js       ← configurazione assistente
│   ├── messages.js        ← gestione messaggi WhatsApp
│   ├── bookings.js        ← prenotazioni
│   ├── twilio.js          ← chiamate vocali
│   └── stripe.js          ← pagamenti
├── services/
│   ├── supabase.js        ← connessione database
│   ├── claude.js          ← AI che risponde
│   ├── whatsapp.js        ← invio/ricezione messaggi
│   └── calendar.js        ← Google Calendar
└── frontend/
    ├── landing.html        ← pagina di vendita (già creata)
    └── dashboard.html      ← pannello cliente (già creato)
```
