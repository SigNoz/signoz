export const DASHBOARD_CACHE_TIME = 30_000;
// keep it low or zero, otherwise, when enabled auto-refresh, this causes OOM due to accumulated queries in cache
export const DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED = 0;
