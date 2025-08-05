import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory store for recent webhook events
// In production, this would be stored in Redis or a database
let recentWebhookEvents: Array<{
  id: string;
  type: string;
  timestamp: number;
  metadata?: any;
}> = [];

// Clean up old events (keep only last 10 minutes)
const cleanupOldEvents = () => {
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  recentWebhookEvents = recentWebhookEvents.filter(event => event.timestamp > tenMinutesAgo);
};

// Function to add webhook event (called from stripeWebhook.ts)
export const addWebhookEvent = (type: string, metadata?: any) => {
  cleanupOldEvents();
  recentWebhookEvents.push({
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: Date.now(),
    metadata
  });
};

// Function to get events since a timestamp
export const getEventsSince = (since: number) => {
  cleanupOldEvents();
  return recentWebhookEvents.filter(event => event.timestamp > since);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { since } = req.query;
  const sinceTimestamp = since ? parseInt(since as string) : 0;

  try {
    const events = getEventsSince(sinceTimestamp);
    res.status(200).json({ events });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 
