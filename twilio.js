// ============================================
//  Twilio – Chiamate vocali con AI
// ============================================
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const supabase = require('../services/supabase');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// POST /api/twilio/incoming – risponde a chiamate in arrivo
// (configura questo URL nel pannello Twilio come webhook)
router.post('/incoming', async (req, res) => {
  const callerNumber = req.body.From;
  const toNumber     = req.body.To;

  // Trova l'assistente associato al numero chiamato
  const { data: assistant } = await supabase
    .from('assistants')
    .select('user_id, business_name, voice_name')
    .eq('whatsapp_number', toNumber)
    .single();

  const businessName = assistant?.business_name || 'la nostra attività';
  const voiceName    = assistant?.voice_name || 'Sofia';

  // TwiML: risposta vocale
  const twiml = new twilio.twiml.VoiceResponse();

  // Saluto iniziale
  twiml.say({
    language: 'it-IT',
    voice: getTwilioVoice(voiceName)
  }, `Benvenuto in ${businessName}. Sono l'assistente virtuale. Come posso aiutarti?`);

  // Ascolta risposta del cliente
  const gather = twiml.gather({
    input: 'speech',
    language: 'it-IT',
    speechTimeout: 'auto',
    action: `/api/twilio/respond?userId=${assistant?.user_id}&voiceName=${voiceName}&businessName=${encodeURIComponent(businessName)}`,
    method: 'POST'
  });

  gather.say({ language: 'it-IT', voice: getTwilioVoice(voiceName) },
    'Prego, parla pure.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// POST /api/twilio/respond – elabora risposta vocale e risponde con AI
router.post('/respond', async (req, res) => {
  const speechResult = req.body.SpeechResult;
  const { userId, voiceName, businessName } = req.query;

  const twiml = new twilio.twiml.VoiceResponse();

  if (!speechResult) {
    twiml.say({ language: 'it-IT', voice: getTwilioVoice(voiceName) },
      'Non ho sentito bene. Richiama pure, sarò felice di aiutarti. Arrivederci!');
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  // Genera risposta AI
  const { generateReply } = require('../services/claude');
  const reply = await generateReply(userId, speechResult, []);

  // Rispondi vocalmente
  twiml.say({ language: 'it-IT', voice: getTwilioVoice(voiceName) }, reply);

  // Continua il dialogo
  const gather = twiml.gather({
    input: 'speech',
    language: 'it-IT',
    speechTimeout: 'auto',
    action: `/api/twilio/respond?userId=${userId}&voiceName=${voiceName}&businessName=${encodeURIComponent(businessName)}`,
    method: 'POST'
  });
  gather.say({ language: 'it-IT', voice: getTwilioVoice(voiceName) },
    'Posso aiutarti con altro?');

  res.type('text/xml');
  res.send(twiml.toString());
});

// Mappa nome voce → voce Twilio italiana
function getTwilioVoice(name) {
  const voices = {
    'Sofia':   'Polly.Bianca',   // F italiana AWS
    'Chiara':  'Polly.Bianca',
    'Giulia':  'Polly.Bianca',
    'Aurora':  'Polly.Bianca',
    'Martina': 'Polly.Bianca',
    'Beatrice':'Polly.Bianca',
    'Luca':    'Polly.Giorgio',  // M italiano AWS
    'Marco':   'Polly.Giorgio'
  };
  return voices[name] || 'Polly.Bianca';
}

module.exports = router;
