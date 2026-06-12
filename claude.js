// ============================================
//  Claude AI – Risponde ai messaggi WhatsApp
// ============================================
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('./supabase');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Genera una risposta AI per un messaggio WhatsApp
 * @param {string} userId - ID del cliente (proprietario dell'assistente)
 * @param {string} customerMessage - Messaggio ricevuto dal cliente finale
 * @param {Array} history - Storico della conversazione
 */
async function generateReply(userId, customerMessage, history = []) {
  try {
    // Carica configurazione assistente
    const { data: assistant } = await supabase
      .from('assistants')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Carica documenti del Cervello AI
    const { data: docs } = await supabase
      .from('documents')
      .select('name, content')
      .eq('user_id', userId);

    // Costruisci il system prompt personalizzato
    const docsText = docs && docs.length > 0
      ? '\n\nDOCUMENTI DELLA TUA ATTIVITA\':\n' + docs.map(d => `--- ${d.name} ---\n${d.content}`).join('\n\n')
      : '';

    const orariText = assistant?.opening_hours
      ? '\n\nORARI DI APERTURA:\n' + formatOrari(assistant.opening_hours)
      : '';

    const systemPrompt = assistant?.system_prompt || `
Sei l'assistente virtuale di ${assistant?.business_name || 'questa attività'}.
Rispondi sempre in italiano, in modo cordiale e professionale.
Aiuta i clienti con informazioni, prenotazioni e domande.
Se non sai qualcosa, di' che chiederai al titolare.
Non inventare prezzi o disponibilità che non conosci.
${orariText}
${docsText}
    `.trim();

    // Converti storico in formato Claude
    const messages = [
      ...history.map(m => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: customerMessage }
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages
    });

    return response.content[0].text;

  } catch (error) {
    console.error('Errore Claude:', error);
    return 'Scusa, ho avuto un problema tecnico. Riprova tra poco o contattaci direttamente.';
  }
}

function formatOrari(hours) {
  return Object.entries(hours).map(([giorno, info]) => {
    if (!info.open) return `${giorno}: Chiuso`;
    return `${giorno}: ${info.from} – ${info.to}`;
  }).join('\n');
}

module.exports = { generateReply };
