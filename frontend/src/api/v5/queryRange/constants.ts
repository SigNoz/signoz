// V5 Query Range Constants

import { RequestType } from 'types/api/v5/queryRange';

// ===================== Schema and Version Constants =====================

// ===================== Default Values =====================

// ===================== Request Type Constants =====================

export const REQUEST_TYPES: Record<string, RequestType> = {
	SCALAR: 'scalar',
	TIME_SERIES: 'time_series',
	RAW: 'raw',
	DISTRIBUTION: 'distribution',
} as const;

// ===================== Signal Type Constants =====================

// ===================== Common Aggregation Expressions =====================

// ===================== Common Filter Expressions =====================

// ===================== Common Group By Fields =====================

// ===================== Function Names =====================

// ===================== Common Step Intervals =====================

// ===================== Time Range Presets =====================
