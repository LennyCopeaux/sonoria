export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

export const resolvePagination = (
  params: PaginationParams = {},
  defaults: { limit: number; maxLimit: number } = { limit: 20, maxLimit: 100 },
): PaginationResult => {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const requested = Math.floor(params.limit ?? defaults.limit);
  const limit = Math.min(Math.max(1, requested), defaults.maxLimit);
  return { page, limit, offset: (page - 1) * limit };
};

export const totalPages = (total: number, limit: number): number =>
  limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
