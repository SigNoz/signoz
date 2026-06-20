// Default page size for the model-cost list request / pagination.
export const PAGE_SIZE = 20;

// URL query-param keys backing the current page and page size. These match the
// keys passed to TanStackTable's `enableQueryParams`, so the table owns the
// writes while the tab reads them to build the list request.
export const PAGE_KEY = 'page';
export const LIMIT_KEY = 'limit';

// Number of skeleton rows shown while the first page is loading.
export const SKELETON_ROW_COUNT = 10;
