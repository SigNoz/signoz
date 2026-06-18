import { DashboardtypesListVariableSpecSortDTO as VariableSortDTO } from 'api/generated/services/sigNoz.schemas';
import type { VariableDefaultValueDTO } from 'api/generated/services/sigNoz.schemas';
import type { TSortVariableValuesType } from 'types/api/dashboard/getAll';

/**
 * Flat, UI-friendly representation of a V2 dashboard variable. The wire format
 * (`DashboardtypesVariableDTO`) is a nested envelope/plugin union that is awkward
 * to bind a form to; `variableAdapters` converts between this model and the DTO.
 */

export type VariableType = 'QUERY' | 'CUSTOM' | 'TEXT' | 'DYNAMIC';

export type TelemetrySignal = 'traces' | 'logs' | 'metrics';

/** Wire `kind` discriminators (string values of the generated enums). */
export const ENVELOPE_KIND = {
	LIST: 'ListVariable',
	TEXT: 'TextVariable',
} as const;

export const PLUGIN_KIND = {
	QUERY: 'signoz/QueryVariable',
	CUSTOM: 'signoz/CustomVariable',
	DYNAMIC: 'signoz/DynamicVariable',
} as const;

export const VARIABLE_SORTS: VariableSortDTO[] = Object.values(VariableSortDTO);

/** Direction the preview sorter should apply for a given wire sort value. */
export function sortDirectionOf(
	sort: VariableSortDTO,
): TSortVariableValuesType {
	if (sort.endsWith('-asc')) {
		return 'ASC';
	}
	if (sort.endsWith('-desc')) {
		return 'DESC';
	}
	return 'DISABLED';
}

export const TELEMETRY_SIGNALS: TelemetrySignal[] = [
	'traces',
	'logs',
	'metrics',
];

export interface VariableFormModel {
	/** Stable identifier, referenced in queries (e.g. `$name`); must be unique. */
	name: string;
	description: string;
	hidden: boolean;
	type: VariableType;

	// List-variable common fields (Query / Custom / Dynamic).
	multiSelect: boolean;
	showAllOption: boolean;
	sort: VariableSortDTO;

	// Type-specific.
	queryValue: string; // QUERY
	customValue: string; // CUSTOM
	textValue: string; // TEXT
	textConstant: boolean; // TEXT
	dynamicAttribute: string; // DYNAMIC — the telemetry field name
	dynamicSignal: TelemetrySignal; // DYNAMIC — the telemetry signal

	/**
	 * Runtime-selected default, not editable in the management tab yet; carried
	 * through edits so saving a definition doesn't clobber it.
	 */
	defaultValue?: VariableDefaultValueDTO;
}

export function emptyVariableFormModel(): VariableFormModel {
	return {
		name: '',
		description: '',
		hidden: false,
		type: 'QUERY',
		multiSelect: false,
		showAllOption: false,
		sort: VariableSortDTO.none,
		queryValue: '',
		customValue: '',
		textValue: '',
		textConstant: false,
		dynamicAttribute: '',
		dynamicSignal: 'traces',
	};
}
