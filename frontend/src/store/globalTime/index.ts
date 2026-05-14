/**
 * # Global Time Store
 *
 * Centralized time management for the application with auto-refresh support.
 *
 * ## Quick Start
 *
 * ```tsx
 * import { useGlobalTime, NANO_SECOND_MULTIPLIER } from 'store/globalTime';
 *
 * function MyComponent() {
 *   const selectedTime = useGlobalTime((s) => s.selectedTime);
 *   const getMinMaxTime = useGlobalTime((s) => s.getMinMaxTime);
 *   const getAutoRefreshQueryKey = useGlobalTime((s) => s.getAutoRefreshQueryKey);
 *   const isRefreshEnabled = useGlobalTime((s) => s.isRefreshEnabled);
 *   const refreshInterval = useGlobalTime((s) => s.refreshInterval);
 *
 *   const { data } = useQuery({
 *     queryKey: getAutoRefreshQueryKey(selectedTime, 'MY_QUERY', params),
 *     queryFn: () => {
 *       const { minTime, maxTime } = getMinMaxTime();
 *       const start = Math.floor(minTime / NANO_SECOND_MULTIPLIER / 1000);
 *       const end = Math.floor(maxTime / NANO_SECOND_MULTIPLIER / 1000);
 *       return fetchData({ start, end });
 *     },
 *     refetchInterval: isRefreshEnabled ? refreshInterval : false,
 *   });
 * }
 * ```
 *
 * ## Core Concepts
 *
 * ### Time Formats
 *
 * | Format | Example | Description |
 * |--------|---------|-------------|
 * | Relative | `'15m'`, `'1h'`, `'1d'` | Duration from now, supports auto-refresh |
 * | Custom | `'1234567890||_||1234567899'` | Fixed range in nanoseconds, no auto-refresh |
 *
 * ### Time Units
 *
 * - Store values are in **nanoseconds**
 * - Most APIs expect **seconds**
 * - Convert to have seconds: `Math.floor(nanoTime / NANO_SECOND_MULTIPLIER / 1000)`
 * - Convert to have ms: `Math.floor(nanoTime / NANO_SECOND_MULTIPLIER)`
 *
 * ## Integration Guide
 *
 * ### Step 1: Get Store State
 *
 * Use selectors for optimal re-render performance:
 *
 * ```tsx
 * // Good - only re-renders when selectedTime changes
 * const selectedTime = useGlobalTime((s) => s.selectedTime);
 * const getMinMaxTime = useGlobalTime((s) => s.getMinMaxTime);
 *
 * // Avoid - re-renders on ANY store change
 * const store = useGlobalTime();
 * ```
 *
 * ### Step 2: Build Query Key
 *
 * Use the store's `getAutoRefreshQueryKey` to enable auto-refresh:
 *
 * ```tsx
 * const getAutoRefreshQueryKey = useGlobalTime((s) => s.getAutoRefreshQueryKey);
 *
 * const queryKey = useMemo(
 *   () => getAutoRefreshQueryKey(
 *     selectedTime,      // Required - triggers invalidation
 *     'UNIQUE_KEY',      // Your query identifier
 *     ...otherParams     // Additional cache-busting params
 *   ),
 *   [getAutoRefreshQueryKey, selectedTime, ...deps]
 * );
 * ```
 *
 * **Note:** For named providers (with `name` prop), query keys are automatically
 * scoped to that store, enabling isolated invalidation and refresh tracking.
 *
 * ### Step 3: Fetch Data
 *
 * **IMPORTANT**: Call `getMinMaxTime()` INSIDE `queryFn`:
 *
 * ```tsx
 * const { data } = useQuery({
 *   queryKey,
 *   queryFn: () => {
 *     // Fresh time values computed here during auto-refresh
 *     const { minTime, maxTime } = getMinMaxTime();
 *     const start = Math.floor(minTime / NANO_SECOND_MULTIPLIER / 1000);
 *     const end = Math.floor(maxTime / NANO_SECOND_MULTIPLIER / 1000);
 *     return api.fetch({ start, end });
 *   },
 *   refetchInterval: isRefreshEnabled ? refreshInterval : false,
 * });
 * ```
 *
 * ### Step 4: Add Refresh Button (Optional)
 *
 * ```tsx
 * import {
 *   useGlobalTimeQueryInvalidate,
 *   useIsGlobalTimeQueryRefreshing,
 * } from 'store/globalTime';
 *
 * function RefreshButton() {
 *   const invalidate = useGlobalTimeQueryInvalidate();
 *   const isRefreshing = useIsGlobalTimeQueryRefreshing();
 *
 *   return (
 *     <button onClick={invalidate} disabled={isRefreshing}>
 *       {isRefreshing ? 'Refreshing...' : 'Refresh'}
 *     </button>
 *   );
 * }
 * ```
 *
 * ## Avoiding Stale Data
 *
 * ### Problem: Time Drift During Refresh
 *
 * If multiple queries compute time independently, they may use different values:
 *
 * ```tsx
 * // BAD - each query gets different time
 * queryFn: () => {
 *   const now = Date.now();
 *   return fetchData({ end: now, start: now - duration });
 * }
 * ```
 *
 * ### Solution: Use getMinMaxTime()
 *
 * `getMinMaxTime()` ensures all queries use consistent timestamps:
 * - When auto-refresh is **disabled**: returns cached values from `computeAndStoreMinMax()`
 * - When auto-refresh is **enabled**: computes fresh values (rounded to 5-second boundaries)
 *
 * Since values are rounded to 5-second boundaries, all queries calling `getMinMaxTime()`
 * within the same 5-second window get identical timestamps.
 *
 * ```tsx
 * // GOOD - all queries get same time
 * queryFn: () => {
 *   const { minTime, maxTime } = getMinMaxTime();
 *   return fetchData({ start: minTime, end: maxTime });
 * }
 * ```
 *
 * ### How It Works
 *
 * **Manual refresh:**
 * 1. User clicks refresh
 * 2. `useGlobalTimeQueryInvalidate` calls `computeAndStoreMinMax()`
 * 3. Fresh min/max stored in `lastComputedMinMax`
 * 4. All queries re-run and call `getMinMaxTime()`
 * 5. All get the SAME cached values
 *
 * **Auto-refresh (when `isRefreshEnabled = true`):**
 * 1. React-query's `refetchInterval` triggers query re-execution
 * 2. `getMinMaxTime()` computes fresh values (rounded to 5 seconds)
 * 3. If values changed, updates `lastComputedMinMax` cache
 * 4. All queries within same 5-second window get consistent values
 *
 * ## Auto-Refresh Setup
 *
 * Auto-refresh is enabled when:
 * - `selectedTime` is a relative duration (e.g., `'15m'`)
 * - `refreshInterval > 0`
 *
 * ```tsx
 * // Auto-refresh configuration
 * const selectedTime = useGlobalTime((s) => s.selectedTime);
 * const getAutoRefreshQueryKey = useGlobalTime((s) => s.getAutoRefreshQueryKey);
 * const isRefreshEnabled = useGlobalTime((s) => s.isRefreshEnabled);
 * const refreshInterval = useGlobalTime((s) => s.refreshInterval);
 *
 * useQuery({
 *   queryKey: getAutoRefreshQueryKey(selectedTime, 'MY_QUERY'),
 *   queryFn: () => { ... },
 *   // Enable periodic refetch
 *   refetchInterval: isRefreshEnabled ? refreshInterval : false,
 * });
 * ```
 *
 * ## API Reference
 *
 * ### Hooks
 *
 * | Hook | Returns | Description |
 * |------|---------|-------------|
 * | `useGlobalTime(selector?)` | `T` | Access store state with optional selector |
 * | `useGlobalTimeQueryInvalidate()` | `() => Promise<void>` | Invalidate all auto-refresh queries |
 * | `useIsGlobalTimeQueryRefreshing()` | `boolean` | Check if any query is refreshing |
 * | `useIsCustomTimeRange()` | `boolean` | Check if using fixed time range |
 * | `useLastComputedMinMax()` | `ParsedTimeRange` | Get cached min/max values |
 * | `useGlobalTimeStoreApi()` | `GlobalTimeStoreApi` | Get raw store API |
 *
 * ### Store Actions
 *
 * | Action | Description |
 * |--------|-------------|
 * | `setSelectedTime(time, interval?)` | Set time range and optional refresh interval (resets cache) |
 * | `setRefreshInterval(ms)` | Set auto-refresh interval |
 * | `getMinMaxTime(time?)` | Get min/max (fresh if auto-refresh enabled, cached otherwise) |
 * | `computeAndStoreMinMax()` | Compute fresh values and cache them |
 * | `getAutoRefreshQueryKey(time, ...parts)` | Build scoped query key for this store instance |
 *
 * ### Utilities
 *
 * | Function | Description |
 * |----------|-------------|
 * | `getAutoRefreshQueryKey(time, ...parts)` | **@deprecated** Use store action instead |
 * | `parseSelectedTime(time)` | Parse time string to min/max (fresh computation) |
 * | `isCustomTimeRange(time)` | Check if time is custom range format |
 * | `createCustomTimeRange(min, max)` | Create custom range string |
 *
 * ### Constants
 *
 * | Constant | Value | Description |
 * |----------|-------|-------------|
 * | `NANO_SECOND_MULTIPLIER` | `1000000` | Convert ms to ns |
 * | `CUSTOM_TIME_SEPARATOR` | `'||_||'` | Separator in custom range strings |
 *
 * ## Context & Composition
 *
 * ### Why Use Context?
 *
 * By default, `useGlobalTime()` uses a shared global store. Use `GlobalTimeProvider`
 * to create isolated time state for specific UI sections (modals, drawers, etc.).
 *
 * ### Provider Options
 *
 * | Option | Type | Description |
 * |--------|------|-------------|
 * | `name` | `string` | Scope query keys to this store (enables isolated invalidation) |
 * | `inheritGlobalTime` | `boolean` | Initialize with parent/global time value |
 * | `initialTime` | `string` | Initial time if not inheriting |
 * | `enableUrlParams` | `boolean \| object` | Sync time to URL query params |
 * | `removeQueryParamsOnUnmount` | `boolean` | Clean URL params on unmount |
 * | `localStoragePersistKey` | `string` | Persist time to localStorage |
 * | `refreshInterval` | `number` | Initial auto-refresh interval (ms) |
 *
 * ### Example 1: Isolated Time in Modal
 *
 * A modal with its own time picker that doesn't affect the main page:
 *
 * ```tsx
 * import { GlobalTimeProvider, useGlobalTime } from 'store/globalTime';
 *
 * function EntityDetailsModal({ entity, onClose }) {
 *   return (
 *     <Modal open onClose={onClose}>
 *       // Isolated time context - changes here don't affect parent
 *       <GlobalTimeProvider
 *         inheritGlobalTime  // Start with parent's current time
 *         refreshInterval={0} // No auto-refresh in modal
 *       >
 *         <ModalContent entity={entity} />
 *       </GlobalTimeProvider>
 *     </Modal>
 *   );
 * }
 *
 * function ModalContent({ entity }) {
 *   // This useGlobalTime reads from the modal's isolated store
 *   const selectedTime = useGlobalTime((s) => s.selectedTime);
 *   const setSelectedTime = useGlobalTime((s) => s.setSelectedTime);
 *
 *   return (
 *     <>
 *       <DateTimePicker
 *         value={selectedTime}
 *         onChange={(time) => setSelectedTime(time)}
 *       />
 *       <EntityMetrics entity={entity} />
 *       <EntityLogs entity={entity} />
 *     </>
 *   );
 * }
 * ```
 *
 * ### Example 2: List Page with Detail Drawer
 *
 * Main list uses global time, drawer has independent time:
 *
 * ```tsx
 * // Main list page - uses global time (no provider needed)
 * function K8sPodsList() {
 *   const selectedTime = useGlobalTime((s) => s.selectedTime);
 *   const [selectedPod, setSelectedPod] = useState(null);
 *
 *   return (
 *     <>
 *       <PageHeader>
 *         <DateTimeSelectionV3 /> // Controls global time
 *       </PageHeader>
 *
 *       <PodsTable
 *         timeRange={selectedTime}
 *         onRowClick={setSelectedPod}
 *       />
 *
 *       {selectedPod && (
 *         <PodDetailsDrawer
 *           pod={selectedPod}
 *           onClose={() => setSelectedPod(null)}
 *         />
 *       )}
 *     </>
 *   );
 * }
 *
 * // Drawer with its own time context
 * function PodDetailsDrawer({ pod, onClose }) {
 *   return (
 *     <Drawer open onClose={onClose}>
 *       <GlobalTimeProvider
 *         name="pod-drawer"          // Scopes queries - only this drawer's queries are invalidated
 *         inheritGlobalTime          // Start with list's time
 *         removeQueryParamsOnUnmount // Clean up URL when drawer closes
 *         enableUrlParams={{
 *           relativeTimeKey: 'drawerTime',
 *           startTimeKey: 'drawerStart',
 *           endTimeKey: 'drawerEnd',
 *         }}
 *       >
 *         <DrawerHeader>
 *           <DateTimeSelectionV3 /> // Controls drawer's time only
 *         </DrawerHeader>
 *
 *         <Tabs>
 *           <Tab label="Metrics"><PodMetrics pod={pod} /></Tab>
 *           <Tab label="Logs"><PodLogs pod={pod} /></Tab>
 *           <Tab label="Events"><PodEvents pod={pod} /></Tab>
 *         </Tabs>
 *       </GlobalTimeProvider>
 *     </Drawer>
 *   );
 * }
 * ```
 *
 * ### Example 3: Nested Contexts
 *
 * Contexts can be nested - each level creates isolation:
 *
 * ```tsx
 * // App level - global time
 * function App() {
 *   return (
 *     <QueryClientProvider>
 *       // No provider here = uses defaultGlobalTimeStore
 *       <Dashboard />
 *     </QueryClientProvider>
 *   );
 * }
 *
 * // Dashboard with comparison panel
 * function Dashboard() {
 *   return (
 *     <div className="dashboard">
 *       // Main dashboard uses global time
 *       <MainCharts />
 *
 *       // Comparison panel has its own time
 *       <GlobalTimeProvider initialTime="1h">
 *         <ComparisonPanel />
 *       </GlobalTimeProvider>
 *     </div>
 *   );
 * }
 *
 * function ComparisonPanel() {
 *   // This reads from ComparisonPanel's isolated store (1h)
 *   // Not affected by global time changes
 *   const selectedTime = useGlobalTime((s) => s.selectedTime);
 *   return <ComparisonCharts timeRange={selectedTime} />;
 * }
 * ```
 *
 * ### Example 4: URL Sync for Shareable Links
 *
 * Persist time selection to URL for shareable links:
 *
 * ```tsx
 * function TracesExplorer() {
 *   return (
 *     <GlobalTimeProvider
 *       enableUrlParams={{
 *         relativeTimeKey: 'time',      // ?time=15m
 *         startTimeKey: 'startTime',    // ?startTime=1234567890
 *         endTimeKey: 'endTime',        // ?endTime=1234567899
 *       }}
 *       initialTime="15m"  // Fallback if URL has no time params
 *     >
 *       <TracesContent />
 *     </GlobalTimeProvider>
 *   );
 * }
 * ```
 *
 * ### Example 5: localStorage Persistence
 *
 * Remember user's last selected time across sessions:
 *
 * ```tsx
 * function MetricsExplorer() {
 *   return (
 *     <GlobalTimeProvider
 *       localStoragePersistKey="metrics-explorer-time"
 *       initialTime="1h"  // Fallback for first visit
 *     >
 *       <MetricsContent />
 *     </GlobalTimeProvider>
 *   );
 * }
 * ```
 *
 * ### Context Resolution Order
 *
 * When `useGlobalTime()` is called, it resolves the store in this order:
 *
 * 1. Nearest `GlobalTimeProvider` ancestor (if any)
 * 2. `defaultGlobalTimeStore` (global singleton)
 *
 * ```
 * App (no provider -> uses defaultGlobalTimeStore)
 * |-- Dashboard
 *     |-- MainCharts (uses defaultGlobalTimeStore)
 *     |-- GlobalTimeProvider (isolated store A)
 *         |-- ComparisonPanel (uses store A)
 *             |-- GlobalTimeProvider (isolated store B)
 *                 |-- NestedChart (uses store B)
 * ```
 *
 * ### Scoped Query Keys with `name`
 *
 * The `name` prop enables isolated query invalidation. When a provider has a name,
 * its queries are prefixed with that name, so invalidation only affects that store:
 *
 * ```tsx
 * // Main page - unnamed store
 * // Query keys: ['AUTO_REFRESH_QUERY', 'METRICS', ...]
 * function MainDashboard() {
 *   const getAutoRefreshQueryKey = useGlobalTime((s) => s.getAutoRefreshQueryKey);
 *   // ...
 * }
 *
 * // Drawer - named store
 * // Query keys: ['AUTO_REFRESH_QUERY', 'drawer', 'METRICS', ...]
 * function DetailDrawer() {
 *   return (
 *     <GlobalTimeProvider name="drawer" inheritGlobalTime>
 *       <DrawerContent />
 *     </GlobalTimeProvider>
 *   );
 * }
 *
 * function DrawerContent() {
 *   const getAutoRefreshQueryKey = useGlobalTime((s) => s.getAutoRefreshQueryKey);
 *   const invalidate = useGlobalTimeQueryInvalidate();
 *   // invalidate() only refreshes queries with 'drawer' prefix
 * }
 * ```
 *
 * ## Complete Example
 *
 * ```tsx
 * import { useMemo } from 'react';
 * import { useQuery } from 'react-query';
 * import { useGlobalTime, NANO_SECOND_MULTIPLIER } from 'store/globalTime';
 *
 * function MetricsPanel({ entityId }: { entityId: string }) {
 *   // 1. Get store state with selectors
 *   const selectedTime = useGlobalTime((s) => s.selectedTime);
 *   const getMinMaxTime = useGlobalTime((s) => s.getMinMaxTime);
 *   const getAutoRefreshQueryKey = useGlobalTime((s) => s.getAutoRefreshQueryKey);
 *   const isRefreshEnabled = useGlobalTime((s) => s.isRefreshEnabled);
 *   const refreshInterval = useGlobalTime((s) => s.refreshInterval);
 *
 *   // 2. Build query key (memoized) - automatically scoped if using named provider
 *   const queryKey = useMemo(
 *     () => getAutoRefreshQueryKey(selectedTime, 'METRICS', entityId),
 *     [getAutoRefreshQueryKey, selectedTime, entityId]
 *   );
 *
 *   // 3. Query with auto-refresh
 *   const { data, isLoading } = useQuery({
 *     queryKey,
 *     queryFn: () => {
 *       // Get fresh time inside queryFn
 *       const { minTime, maxTime } = getMinMaxTime();
 *       const start = Math.floor(minTime / NANO_SECOND_MULTIPLIER / 1000);
 *       const end = Math.floor(maxTime / NANO_SECOND_MULTIPLIER / 1000);
 *
 *       return fetchMetrics({ entityId, start, end });
 *     },
 *     refetchInterval: isRefreshEnabled ? refreshInterval : false,
 *   });
 *
 *   return <Chart data={data} loading={isLoading} />;
 * }
 * ```
 *
 * @module store/globalTime
 */

// Store
export {
	createGlobalTimeStore,
	defaultGlobalTimeStore,
	useGlobalTimeStore,
} from './globalTimeStore';
export type { GlobalTimeStoreApi } from './globalTimeStore';

// Context & Provider
export { GlobalTimeContext, GlobalTimeProvider } from './GlobalTimeContext';

// Hooks
export {
	useGlobalTime,
	useGlobalTimeStoreApi,
	useIsCustomTimeRange,
	useLastComputedMinMax,
} from './hooks';

// Query hooks for auto-refresh
export { useGlobalTimeQueryInvalidate } from './useGlobalTimeQueryInvalidate';
export { useIsGlobalTimeQueryRefreshing } from './useIsGlobalTimeQueryRefreshing';

// Types
export type {
	CustomTimeRange,
	CustomTimeRangeSeparator,
	GlobalTimeActions,
	GlobalTimeProviderOptions,
	GlobalTimeSelectedTime,
	GlobalTimeState,
	GlobalTimeStore,
	IGlobalTimeStoreActions,
	IGlobalTimeStoreState,
	ParsedTimeRange,
} from './types';

// Utilities
export {
	createCustomTimeRange,
	CUSTOM_TIME_SEPARATOR,
	getAutoRefreshQueryKey,
	isCustomTimeRange,
	NANO_SECOND_MULTIPLIER,
	parseCustomTimeRange,
	parseSelectedTime,
} from './utils';

// Internal hooks (for advanced use cases)
export { useQueryCacheSync } from './useQueryCacheSync';
