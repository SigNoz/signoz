import { useEffect, useState } from 'react';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ensureLogsRequiredColumns } from 'container/OptionsMenu/constants';
import { has } from 'lodash-es';

import aiObservabilityLoaderConfig from '../configs/aiObservabilityLoaderConfig';
import logsLoaderConfig from '../configs/logsLoaderConfig';
import tracesLoaderConfig from '../configs/tracesLoaderConfig';
import { FormattingOptions, Preferences, PreferenceSourcePage } from '../types';

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
	const { columns } = preferencesLoader<Preferences>(tracesLoaderConfig);
	return { columns };
}

// Loads the open panel only. Same priority as the other loaders: localStorage,
// then the url, then the defaults.
function aiObservabilityPreferencesLoader(
	panelType?: PANEL_TYPES,
): Preferences {
	if (!panelType) {
		return { columns: [] };
	}
	return {
		columns:
			aiObservabilityLoaderConfig.local().panels[panelType] ??
			aiObservabilityLoaderConfig.url().panels[panelType] ??
			aiObservabilityLoaderConfig.default(panelType).columns,
		panelType,
	};
}

const PREFERENCE_LOADERS: Record<
	PreferenceSourcePage,
	(panelType?: PANEL_TYPES) => Preferences
> = {
	[SavedviewtypesSourceDTO.logs]: logsPreferencesLoader,
	[SavedviewtypesSourceDTO.traces]: tracesPreferencesLoader,
	[SavedviewtypesSourceDTO.ai_observability]: aiObservabilityPreferencesLoader,
};

export function usePreferenceLoader({
	sourcePage,
	panelType,
	reSync,
	setReSync,
}: {
	sourcePage: PreferenceSourcePage;
	panelType?: PANEL_TYPES;
	reSync: boolean;
	setReSync: (value: boolean) => void;
}): {
	preferences: Preferences | null;
	loading: boolean;
	error: Error | null;
} {
	const loadSlicePreferences = PREFERENCE_LOADERS[sourcePage];
	const [preferences, setPreferences] = useState<Preferences | null>(() =>
		loadSlicePreferences(panelType),
	);
	const [error, setError] = useState<Error | null>(null);

	// Switching panels loads the new panel's columns in the same render.
	const [loadedPanelType, setLoadedPanelType] = useState(panelType);
	if (loadedPanelType !== panelType) {
		setLoadedPanelType(panelType);
		setPreferences(loadSlicePreferences(panelType));
	}

	useEffect((): void => {
		function loadPreferences(): void {
			setError(null);

			try {
				setPreferences(loadSlicePreferences(panelType));
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
	}, [loadSlicePreferences, panelType, reSync, setReSync]);

	return { preferences, loading: false, error };
}
