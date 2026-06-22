import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  const prisma = {
    subscription: { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(),
  };
  let service: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionService(prisma as never);
    // $transaction resolves the array of operation results it is given.
    prisma.$transaction.mockImplementation((ops: unknown[]) =>
      Promise.resolve(ops),
    );
  });

  it('subscribes: upserts ACTIVE +30d and promotes the user to SUBSCRIBER', async () => {
    const sub = { id: 'sub-1', status: 'ACTIVE', plan: 'SUBSCRIBER' };
    prisma.subscription.upsert.mockReturnValue(sub);

    const result = await service.subscribe('user-1', { plan: 'SUBSCRIBER' });

    expect(result).toBe(sub);
    const upsertArg = prisma.subscription.upsert.mock.calls[0]?.[0] as {
      where: { userId: string };
      create: { plan: string; status: string; expiresAt: Date };
      update: { status: string };
    };
    expect(upsertArg.where).toEqual({ userId: 'user-1' });
    expect(upsertArg.create.plan).toBe('SUBSCRIBER');
    expect(upsertArg.create.status).toBe('ACTIVE');
    expect(upsertArg.create.expiresAt).toBeInstanceOf(Date);
    expect(upsertArg.update.status).toBe('ACTIVE');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: Role.SUBSCRIBER },
    });
  });

  it('cancels: sets CANCELLED and demotes the user to USER', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: 'sub-1' });
    const cancelled = { id: 'sub-1', status: 'CANCELLED' };
    prisma.subscription.update.mockReturnValue(cancelled);

    const result = await service.cancel('user-1');

    expect(result).toBe(cancelled);
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { status: 'CANCELLED' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: Role.USER },
    });
  });

  it('cancel throws when there is no subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(service.cancel('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getForUser throws when there is no subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(service.getForUser('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
