import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAuth } from '../auth/verify';

type TwilioError = {
  code?: number;
  message?: string;
  more_info?: string;
};

const E164_PHONE = /^\+[1-9]\d{7,14}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifyAdminAuth(req);
  if (!auth.isAdmin) {
    return res.status(401).json({ error: auth.error || 'Admin access required' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const to = typeof req.body?.to === 'string' ? req.body.to.trim() : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (!E164_PHONE.test(to)) {
    return res.status(400).json({ error: 'Enter a phone number in international format, such as +14155552671.' });
  }

  if (!message || message.length > 1600) {
    return res.status(400).json({ error: 'Message must contain between 1 and 1,600 characters.' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !apiKeySid || !apiKeySecret || !messagingServiceSid) {
    return res.status(500).json({ error: 'Twilio is not fully configured on the server.' });
  }

  try {
    const body = new URLSearchParams({
      To: to,
      Body: message,
      MessagingServiceSid: messagingServiceSid,
    });

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    const result = await twilioResponse.json() as TwilioError & { sid?: string; status?: string };

    if (!twilioResponse.ok) {
      const verificationHint = result.code === 21608 || result.code === 14111
        ? ' This destination must be verified while your Twilio account is restricted.'
        : '';
      return res.status(twilioResponse.status >= 500 ? 502 : 400).json({
        error: `${result.message || 'Twilio rejected the message.'}${verificationHint}`,
        code: result.code,
      });
    }

    return res.status(200).json({
      success: true,
      messageSid: result.sid,
      status: result.status || 'queued',
    });
  } catch (error) {
    console.error('Twilio test message failed:', error);
    return res.status(502).json({ error: 'Unable to reach Twilio. Please try again.' });
  }
}
