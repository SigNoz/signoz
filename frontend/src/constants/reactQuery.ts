/**
 * Maximum number of retries for a failed react-query request before giving up.
 * Used as the upper bound in the default `retry` predicate:
 *   `return failureCount < MAX_QUERY_RETRIES;`
 *
 * This retries up to 3 times (4 attempts total including the initial request).
 */
export const MAX_QUERY_RETRIES = 3;
