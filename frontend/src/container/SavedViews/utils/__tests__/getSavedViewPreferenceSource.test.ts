import {
	SavedviewtypesPanelTypeDTO,
	SavedviewtypesSavedViewSpecDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { defaultSelectedColumns as defaultAIListColumns } from 'container/LLMObservability/Explorer/ListView/configs';
import {
	AI_OBSERVABILITY_PREFERENCE_SOURCE,
	AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE,
} from 'providers/preferences/types';
import { DataSource } from 'types/common/queryBuilder';

import { getSavedViewPreferenceSource } from '../getSavedViewPreferenceSource';
import { getViewColumnsAndFormatting } from '../getViewColumnsAndFormatting';

const traceColumns = [
	{ name: 'trace_id' },
	{ name: 'total_tokens' },
] as TelemetryFieldKey[];

const specFor = (
	panelType: SavedviewtypesPanelTypeDTO,
): SavedviewtypesSavedViewSpecDTO =>
	({
		displayName: 'Costly traces',
		panelType,
		queries: [],
		selectedFields: traceColumns,
	}) as unknown as SavedviewtypesSavedViewSpecDTO;

describe('getSavedViewPreferenceSource', () => {
	it.each([
		[SavedviewtypesSourceDTO.logs, PANEL_TYPES.LIST, DataSource.LOGS],
		[SavedviewtypesSourceDTO.traces, PANEL_TYPES.TRACE, DataSource.TRACES],
		[
			SavedviewtypesSourceDTO.ai_observability,
			PANEL_TYPES.LIST,
			AI_OBSERVABILITY_PREFERENCE_SOURCE,
		],
		[
			SavedviewtypesSourceDTO.ai_observability,
			PANEL_TYPES.TRACE,
			AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE,
		],
		[
			SavedviewtypesSourceDTO.ai_observability,
			PANEL_TYPES.TIME_SERIES,
			undefined,
		],
		[SavedviewtypesSourceDTO.metrics, PANEL_TYPES.LIST, undefined],
	])('maps %s on %s to %s', (source, panelType, expected) => {
		expect(getSavedViewPreferenceSource(source, panelType)).toBe(expected);
	});
});

describe('getViewColumnsAndFormatting for AI views', () => {
	it('gives a trace view its own columns', () => {
		expect(
			getViewColumnsAndFormatting(
				specFor(SavedviewtypesPanelTypeDTO.trace),
				AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE,
			).columns,
		).toStrictEqual(traceColumns);
	});

	it('keeps the list tab on its defaults for a trace view', () => {
		expect(
			getViewColumnsAndFormatting(
				specFor(SavedviewtypesPanelTypeDTO.trace),
				AI_OBSERVABILITY_PREFERENCE_SOURCE,
			).columns,
		).toStrictEqual(defaultAIListColumns);
	});

	it('keeps the trace tab on its defaults for a list view', () => {
		expect(
			getViewColumnsAndFormatting(
				specFor(SavedviewtypesPanelTypeDTO.list),
				AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE,
			).columns,
		).toStrictEqual([]);
	});
});
