// API Response wrapper types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  error?: string;
  message?: string;
}

// Standard error response
export interface ApiError {
  success: false;
  error: string;
  message: string;
}
