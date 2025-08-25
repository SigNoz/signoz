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

// Generic preferences loader that works with any config
async function preferencesLoader<T>(config: {
	priority: readonly string[];
	[key: string]: any;
}): Promise<T> {
	const findValidLoader = async (): Promise<T> => {
		// Try each loader in priority order
		const results = await Promise.all(
			config.priority.map(async (source) => ({
				source,
				result: await config[source](),
			})),
		);

		// Find valid columns and formatting independently
		const validColumnsResult = results.find(
			({ result }) => result.columns?.length,
		);

		const validFormattingResult = results.find(({ result }) => result.formatting);

		const migratedColumns = validColumnsResult?.result.columns
			? migrateColumns(validColumnsResult?.result.columns)
			: undefined;

		// Combine valid results or fallback to default
		const finalResult = {
			columns: migratedColumns || config.default().columns,
			formatting:
				validFormattingResult?.result.formatting || config.default().formatting,
		};

		return finalResult as T;
	};

	return findValidLoader();
}

// Use the generic loader with specific configs
async function logsPreferencesLoader(): Promise<{
	columns: TelemetryFieldKey[];
	formatting: FormattingOptions;
}> {
	return preferencesLoader(logsLoaderConfig);
}

async function tracesPreferencesLoader(): Promise<{
	columns: TelemetryFieldKey[];
}> {
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
	const [preferences, setPreferences] = useState<Preferences | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect((): void => {
		async function loadPreferences(): Promise<void> {
			setLoading(true);
			setError(null);

			try {
				if (dataSource === DataSource.LOGS) {
					const { columns, formatting } = await logsPreferencesLoader();
					setPreferences({ columns, formatting });
				}

				if (dataSource === DataSource.TRACES) {
					const { columns } = await tracesPreferencesLoader();
					setPreferences({ columns });
				}
			} catch (e) {
				setError(e as Error);
			} finally {
				setLoading(false);
				// Reset reSync back to false after loading is complete
				if (reSync) {
					setReSync(false);
				}
			}
		}

		// Only load preferences on initial mount or when reSync is true
		if (loading || reSync) {
			loadPreferences();
		}
	}, [dataSource, reSync, setReSync, loading]);

	return { preferences, loading, error };
}
