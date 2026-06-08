export const QUEUE_NAMES = {
  TRANSCODE: 'audio:transcode',
  EMAIL: 'notification:email',
  STATS: 'stats:aggregate',
  RECO: 'reco:refresh',
  CACHE: 'cache:invalidate',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function parseEnabledQueues(raw: string | undefined): Set<QueueName> {
  const defaults = Object.values(QUEUE_NAMES);
  if (!raw?.trim()) {
    return new Set(defaults);
  }

  const enabled = raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return new Set(enabled as QueueName[]);
}

export function isQueueEnabled(
  enabled: Set<QueueName>,
  queue: QueueName,
): boolean {
  return enabled.has(queue);
}
