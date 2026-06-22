import { PaginationParams } from '@sonoria/utils';

export const toPaginationParams = (
  page?: number,
  limit?: number,
): PaginationParams => {
  const params: PaginationParams = {};
  if (page !== undefined) params.page = page;
  if (limit !== undefined) params.limit = limit;
  return params;
};
