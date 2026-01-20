/**
 * Extracts HTTP status code from various error types
 * @param error - The error object (could be APIError, AxiosError, or other error types)
 * @returns HTTP status code if available, undefined otherwise
 */
export const getHttpStatusCode = (error: any): number | undefined => {
	if (!error) return undefined;

	// Try to get status code from APIError instance (transformed by ErrorResponseHandlerV2)
	if (typeof error.getHttpStatusCode === 'function') {
		return error.getHttpStatusCode();
	}

	// Fallback for AxiosError or other error types
	return error?.response?.status || error?.status;
};

/**
 * Determines if an error is retryable based on HTTP status code
 * @param error - The error object
 * @returns true if error is retryable (5xx server errors), false for 4xx client errors
 */
export const isRetryableError = (error: any): boolean => {
	const statusCode = getHttpStatusCode(error);
	// 4xx errors are client errors (not retryable), 5xx errors are server errors (retryable)
	// If no status code is available, default to retryable
	return !statusCode || statusCode >= 500;
};
