import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta) {
    return res.status(statusCode).json({
      success: true,
      data,
      ...(meta && { meta }),
    });
  }

  static created<T>(res: Response, data: T) {
    return ApiResponse.success(res, data, 201);
  }

  static accepted<T>(res: Response, data: T) {
    return ApiResponse.success(res, data, 202);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }

  static error(
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, string>[],
  ) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    });
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    const totalPages = Math.ceil(total / limit);
    return ApiResponse.success(res, data, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  }
}

export default ApiResponse;
