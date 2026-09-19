const MARKET_TIME_ZONE = 'America/Los_Angeles';
const MARKET_OFFER_MAX_MS = 4 * 60 * 60 * 1000;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const marketDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MARKET_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function partsInMarketTime(date: Date): DateParts {
  const values = Object.fromEntries(
    marketDateFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return values as DateParts;
}

function marketLocalTimeToUtc(parts: DateParts) {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let candidate = target;
  for (let pass = 0; pass < 3; pass += 1) {
    const actual = partsInMarketTime(new Date(candidate));
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    candidate += target - actualAsUtc;
  }
  return candidate;
}

export function getScripOfferExpiration(purchasedAt: string) {
  const purchaseTime = new Date(purchasedAt);
  if (Number.isNaN(purchaseTime.getTime())) throw new Error('Invalid Scrip purchase time');

  const localPurchase = partsInMarketTime(purchaseTime);
  const followingDate = new Date(Date.UTC(localPurchase.year, localPurchase.month - 1, localPurchase.day + 1));
  const nextMarketMidnight = marketLocalTimeToUtc({
    year: followingDate.getUTCFullYear(),
    month: followingDate.getUTCMonth() + 1,
    day: followingDate.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  });
  const fourHoursAfterPurchase = purchaseTime.getTime() + MARKET_OFFER_MAX_MS;
  return new Date(Math.min(fourHoursAfterPurchase, nextMarketMidnight)).toISOString();
}
