type TwilioResult = { sid?: string; status?: string; code?: number; message?: string };

export async function sendGoodcupText(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !apiKeySid || !apiKeySecret || !messagingServiceSid) {
    throw new Error('Twilio is not fully configured');
  }

  const body = new URLSearchParams({ To: to, Body: message, MessagingServiceSid: messagingServiceSid });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const result = await response.json() as TwilioResult;
  if (!response.ok) {
    throw new Error(`Twilio rejected the renewal reminder: ${result.message || response.statusText}`);
  }
  return result;
}
