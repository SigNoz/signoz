import { QueryFunctionsTypes } from 'types/common/queryBuilder';

/**
 * Normalizes function names from backend responses to match frontend expectations
 * Backend returns lowercase function names (e.g., 'timeshift') while frontend expects camelCase (e.g., 'timeShift')
 */
export const normalizeFunctionName = (functionName: string): string => {
	// Create a mapping from lowercase to expected camelCase function names
	const functionNameMap: Record<string, string> = {
		// Time shift function
		timeshift: QueryFunctionsTypes.TIME_SHIFT,

		// Other functions that might have case sensitivity issues
		cutoffmin: QueryFunctionsTypes.CUTOFF_MIN,
		cutoffmax: QueryFunctionsTypes.CUTOFF_MAX,
		clampmin: QueryFunctionsTypes.CLAMP_MIN,
		clampmax: QueryFunctionsTypes.CLAMP_MAX,
		absolut: QueryFunctionsTypes.ABSOLUTE,
		runningdiff: QueryFunctionsTypes.RUNNING_DIFF,
		log2: QueryFunctionsTypes.LOG_2,
		log10: QueryFunctionsTypes.LOG_10,
		cumulativesum: QueryFunctionsTypes.CUMULATIVE_SUM,
		ewma3: QueryFunctionsTypes.EWMA_3,
		ewma5: QueryFunctionsTypes.EWMA_5,
		ewma7: QueryFunctionsTypes.EWMA_7,
		median3: QueryFunctionsTypes.MEDIAN_3,
		median5: QueryFunctionsTypes.MEDIAN_5,
		median7: QueryFunctionsTypes.MEDIAN_7,
		anomaly: QueryFunctionsTypes.ANOMALY,
	};

	// Convert to lowercase for case-insensitive matching
	const normalizedName = functionName.toLowerCase();

	// Return the mapped function name or the original if no mapping exists
	return functionNameMap[normalizedName] || functionName;
};
