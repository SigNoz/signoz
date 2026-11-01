import { useEffect, useState } from 'react';
import { TelemetryFieldKey } from 'api/v5/v5';
import { ensureLogsRequiredColumns } from 'container/OptionsMenu/constants';
import { has } from 'lodash-es';
import { DataSource } from 'types/common/queryBuilder';

import aiObservabilityLoaderConfig from '../configs/aiObservabilityLoaderConfig';
import aiObservabilityTraceViewLoaderConfig from '../configs/aiObservabilityTraceViewLoaderConfig';
import logsLoaderConfig from '../configs/logsLoaderConfig';
import tracesLoaderConfig from '../configs/tracesLoaderConfig';
import {
	AI_OBSERVABILITY_PREFERENCE_SOURCE,
	AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE,
	FormattingOptions,
	Preferences,
	PreferenceSource,
} from '../types';

const migrateColumns = (columns: any): any =>
	columns.map((column: any) => {
		if (has(column, 'key') && !has(column, 'name')) {
			return { ...column, name: column.key };
		}
		return column;
	});

// Generic preferences loader that works with any config (synchronous version)
function preferencesLoader<T>(config: {
	priority: readonly string[];
	[key: string]: any;
}): T {
	// Try each loader in priority order synchronously
	const results = config.priority.map((source: string) => ({
		source,
		result: config[source](),
	}));

	// Find valid columns and formatting independently
	const validColumnsResult = results.find(
		({ result }) => result.columns?.length,
	);
	const validFormattingResult = results.find(({ result }) => result.formatting);

	const migratedColumns = validColumnsResult?.result.columns
		? migrateColumns(validColumnsResult.result.columns)
		: undefined;

	// Combine valid results or fallback to default
	const finalResult = {
		columns: migratedColumns || config.default().columns,
		formatting:
			validFormattingResult?.result.formatting || config.default().formatting,
	};

	return finalResult as T;
}

// Use the generic loader with specific configs
function logsPreferencesLoader(): {
	columns: TelemetryFieldKey[];
	formatting: FormattingOptions;
} {
	const result = preferencesLoader<{
		columns: TelemetryFieldKey[];
		formatting: FormattingOptions;
	}>(logsLoaderConfig);
	return { ...result, columns: ensureLogsRequiredColumns(result.columns) };
}

function tracesPreferencesLoader(): {
	columns: TelemetryFieldKey[];
} {
	return preferencesLoader(tracesLoaderConfig);
}

function aiObservabilityPreferencesLoader(): {
	columns: TelemetryFieldKey[];
} {
	return preferencesLoader(aiObservabilityLoaderConfig);
}

function aiObservabilityTraceViewPreferencesLoader(): {
	columns: TelemetryFieldKey[];
} {
	return preferencesLoader(aiObservabilityTraceViewLoaderConfig);
}

export function usePreferenceLoader({
	dataSource,
	reSync,
	setReSync,
}: {
	dataSource: PreferenceSource;
	reSync: boolean;
	setReSync: (value: boolean) => void;
}): {
	preferences: Preferences | null;
	loading: boolean;
	error: Error | null;
} {
	const [preferences, setPreferences] = useState<Preferences | null>(() => {
		if (dataSource === DataSource.LOGS) {
			const { columns, formatting } = logsPreferencesLoader();
			return { columns, formatting };
		}
		if (dataSource === DataSource.TRACES) {
			const { columns } = tracesPreferencesLoader();
			return { columns };
		}
		if (dataSource === AI_OBSERVABILITY_PREFERENCE_SOURCE) {
			const { columns } = aiObservabilityPreferencesLoader();
			return { columns };
		}
		if (dataSource === AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE) {
			const { columns } = aiObservabilityTraceViewPreferencesLoader();
			return { columns };
		}
		return null;
	});
	const [error, setError] = useState<Error | null>(null);

	useEffect((): void => {
		function loadPreferences(): void {
			setError(null);

			try {
				if (dataSource === DataSource.LOGS) {
					const { columns, formatting } = logsPreferencesLoader();
					setPreferences({ columns, formatting });
				}

				if (dataSource === DataSource.TRACES) {
					const { columns } = tracesPreferencesLoader();
					setPreferences({ columns });
				}

				if (dataSource === AI_OBSERVABILITY_PREFERENCE_SOURCE) {
					const { columns } = aiObservabilityPreferencesLoader();
					setPreferences({ columns });
				}

				if (dataSource === AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE) {
					const { columns } = aiObservabilityTraceViewPreferencesLoader();
					setPreferences({ columns });
				}
			} catch (e) {
				setError(e as Error);
			} finally {
				// Reset reSync back to false after loading is complete
				if (reSync) {
					setReSync(false);
				}
			}
		}

		// Only load preferences on initial mount or when reSync is true
		if (reSync) {
			loadPreferences();
		}
	}, [dataSource, reSync, setReSync]);

	return { preferences, loading: false, error };
}
