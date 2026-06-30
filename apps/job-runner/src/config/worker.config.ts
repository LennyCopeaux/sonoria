export function getJobConcurrency(): number {
  const configured = process.env['JOB_CONCURRENCY']?.trim();
  const parsed = configured ? Number(configured) : 4;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}
