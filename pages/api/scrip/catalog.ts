import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveScripCatalog } from '../../../lib/server/scripStripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const products = await resolveScripCatalog();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ products });
  } catch (error) {
    console.error('Unable to load the /scrip catalog:', error);
    return res.status(503).json({ error: 'Subscriptions are temporarily unavailable' });
  }
}
