// ============================================
//  Google Calendar – Prenotazioni automatiche
// ============================================
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Genera il link per autorizzare Google Calendar
 */
function getAuthUrl(userId) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: userId  // passiamo userId per sapere a chi appartiene il token
  });
}

/**
 * Crea un evento nel calendario
 */
async function createEvent(tokens, { title, date, time, duration = 60, description, customerName }) {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const startDateTime = new Date(`${date}T${time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

  const event = {
    summary: `📅 ${title} – ${customerName}`,
    description: description || `Prenotazione per ${customerName}`,
    start: { dateTime: startDateTime.toISOString(), timeZone: 'Europe/Rome' },
    end:   { dateTime: endDateTime.toISOString(),   timeZone: 'Europe/Rome' }
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event
  });

  return response.data;
}

/**
 * Controlla disponibilità in un giorno
 */
async function getEventsForDay(tokens, date) {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay   = new Date(`${date}T23:59:59`);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });

  return response.data.items || [];
}

module.exports = { getAuthUrl, createEvent, getEventsForDay };
