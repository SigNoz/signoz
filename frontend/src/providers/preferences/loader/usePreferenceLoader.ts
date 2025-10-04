/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-empty */
import { TelemetryFieldKey } from 'api/v5/v5';
import { has } from 'lodash-es';
import { useEffect, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import logsLoaderConfig from '../configs/logsLoaderConfig';
import tracesLoaderConfig from '../configs/tracesLoaderConfig';
import { FormattingOptions, Preferences } from '../types';

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
	return preferencesLoader(logsLoaderConfig);
}

function tracesPreferencesLoader(): {
	columns: TelemetryFieldKey[];
} {
	return preferencesLoader(tracesLoaderConfig);
}

export function usePreferenceLoader({
	dataSource,
	reSync,
	setReSync,
}: {
	dataSource: DataSource;
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
