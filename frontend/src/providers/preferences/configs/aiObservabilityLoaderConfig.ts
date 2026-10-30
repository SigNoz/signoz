import getLocalStorageKey from 'api/browser/localstorage/get';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	DEFAULT_PANEL_TYPE,
	TRACE_VIEW_DEFAULT_COLUMNS,
} from 'container/LLMObservability/Explorer/constants';

import { PanelColumns } from '../types';
import { isAiObservabilityExplorerRoute } from '../utils';

/**
 * Validates if a column is valid for the AI observability explorer
 * Needs a name; a column from another signal would fail the trace query
 */
const isValidAiColumn = (column: unknown): column is TelemetryFieldKey => {
	if (!column || typeof column !== 'object') {
		return false;
	}
	const { name, signal } = column as { name?: unknown; signal?: unknown };
	return (
		typeof name === 'string' && name !== '' && (!signal || signal === 'traces')
	);
};

// Keeps the valid columns of each panel; a panel left empty falls back to the
// defaults, like one that was never stored.
const toPanels = (value: unknown): PanelColumns => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return Object.entries(value).reduce<PanelColumns>(
		(panels, [panelType, columns]) => {
			if (!Array.isArray(columns)) {
				return panels;
			}
			const validColumns = columns.filter(isValidAiColumn);
			return validColumns.length
				? { ...panels, [panelType as PANEL_TYPES]: validColumns }
				: panels;
		},
		{},
	);
};

// --- AI OBSERVABILITY preferences loader config ---
// Stored as { [panelType]: columns }. The url keeps the open panel's columns in
// `options.selectColumns`, and `panelTypes` says which panel they belong to.
const aiObservabilityLoaders = {
	local: (): { panels: PanelColumns } => {
		try {
			return {
				panels: toPanels(
					JSON.parse(
						getLocalStorageKey(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS) || '{}',
					),
				),
			};
		} catch {
			return { panels: {} };
		}
	},
	url: (): { panels: PanelColumns } => {
		if (!isAiObservabilityExplorerRoute()) {
			return { panels: {} };
		}
		const urlParams = new URLSearchParams(window.location.search);
		try {
			const options = JSON.parse(urlParams.get('options') || '{}');
			const panelTypeParam = urlParams.get(QueryParams.panelTypes);
			const panelType: PANEL_TYPES = panelTypeParam
				? JSON.parse(panelTypeParam)
				: DEFAULT_PANEL_TYPE;
			return { panels: toPanels({ [panelType]: options?.selectColumns }) };
		} catch {
			return { panels: {} };
		}
	},
	// Only the trace panel keeps columns today.
	default: (panelType: PANEL_TYPES): { columns: TelemetryFieldKey[] } => ({
		columns: panelType === PANEL_TYPES.TRACE ? TRACE_VIEW_DEFAULT_COLUMNS : [],
	}),
};

export default aiObservabilityLoaders;
