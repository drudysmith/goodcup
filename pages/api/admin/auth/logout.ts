import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For JWT-based auth, logout is primarily client-side (removing token)
  // But we could add token blacklisting here if needed in the future
  
  res.status(200).json({ success: true, message: 'Logged out successfully' });
}
