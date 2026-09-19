import { createHmac, timingSafeEqual } from 'crypto';

type ManageLinkPayload = {
  customerId: string;
  subscriptionId: string;
  expiresAt: number;
};

function getSigningSecret() {
  const secret = process.env.SCRIP_LINK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Scrip manage-link signing is not configured');
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac('sha256', getSigningSecret()).update(encodedPayload).digest('base64url');
}

export function createScripManageToken(payload: ManageLinkPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyScripManageToken(token: string): ManageLinkPayload {
  const [encodedPayload, suppliedSignature] = token.split('.');
  if (!encodedPayload || !suppliedSignature) throw new Error('Invalid manage link');

  const expectedSignature = sign(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error('Invalid manage link');
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as ManageLinkPayload;
  if (!payload.customerId?.startsWith('cus_') || !payload.subscriptionId?.startsWith('sub_')) {
    throw new Error('Invalid manage link');
  }
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt < Math.floor(Date.now() / 1000)) {
    throw new Error('This manage link has expired');
  }
  return payload;
}
