import { v4 as generateUUID } from 'uuid';
import type {
	DashboardtypesVariableDTO,
	DashboardtypesVariablePluginDTO,
	DashboardtypesListVariableSpecDTO,
	DashboardTextVariableSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { V2VariableKind, VariableDraft } from './types';

export function emptyDraft(): VariableDraft {
	return {
		id: generateUUID(),
		kind: 'QUERY',
		name: '',
		displayName: '',
		allowAllValue: false,
		allowMultiple: false,
		sort: 'none',
		defaultValue: '',
		customAllValue: '',
		capturingRegexp: '',
		queryValue: '',
		customValue: '',
		dynamicName: '',
		dynamicSignal: undefined,
		textValue: '',
	};
}

/**
 * Hydrate the relevant slot from a V2 envelope; other slots stay empty.
 */
export function variableDTOToDraft(
	dto: DashboardtypesVariableDTO,
): VariableDraft {
	const base = emptyDraft();
	if (dto.kind === 'TextVariable') {
		const spec = dto.spec as DashboardTextVariableSpecDTO;
		return {
			...base,
			kind: 'TEXT',
			name: spec?.name ?? '',
			displayName: spec?.display?.name ?? '',
			textValue: spec?.value ?? '',
		};
	}

	// ListVariable
	const spec = dto.spec as DashboardtypesListVariableSpecDTO;
	const pluginKind = spec?.plugin?.kind;
	let kind: V2VariableKind = 'QUERY';
	if (pluginKind === 'signoz/DynamicVariable') kind = 'DYNAMIC';
	else if (pluginKind === 'signoz/CustomVariable') kind = 'CUSTOM';
	else if (pluginKind === 'signoz/QueryVariable') kind = 'QUERY';

	const draft: VariableDraft = {
		...base,
		kind,
		name: spec?.name ?? '',
		displayName: spec?.display?.name ?? '',
		allowAllValue: !!spec?.allowAllValue,
		allowMultiple: !!spec?.allowMultiple,
		sort: spec?.sort ?? 'none',
		defaultValue: typeof spec?.defaultValue === 'string' ? spec.defaultValue : '',
		customAllValue: spec?.customAllValue ?? '',
		capturingRegexp: spec?.capturingRegexp ?? '',
	};

	const pluginSpec = spec?.plugin?.spec as Record<string, unknown> | undefined;
	if (kind === 'QUERY') {
		draft.queryValue = (pluginSpec?.queryValue as string) ?? '';
	} else if (kind === 'CUSTOM') {
		draft.customValue = (pluginSpec?.customValue as string) ?? '';
	} else if (kind === 'DYNAMIC') {
		draft.dynamicName = (pluginSpec?.name as string) ?? '';
		draft.dynamicSignal = pluginSpec?.signal as TelemetrytypesSignalDTO | undefined;
	}
	return draft;
}

/**
 * Serialize draft to a V2 envelope, reading ONLY the fields relevant to the
 * active kind. Other fields the user touched stay in React state and are
 * silently dropped.
 */
export function draftToVariableDTO(
	draft: VariableDraft,
): DashboardtypesVariableDTO {
	const display = draft.displayName ? { name: draft.displayName } : undefined;

	if (draft.kind === 'TEXT') {
		return ({
			kind: 'TextVariable',
			spec: {
				name: draft.name,
				display,
				value: draft.textValue,
			},
		} as unknown) as DashboardtypesVariableDTO;
	}

	let plugin: DashboardtypesVariablePluginDTO | undefined;
	if (draft.kind === 'QUERY') {
		plugin = ({
			kind: 'signoz/QueryVariable',
			spec: { queryValue: draft.queryValue },
		} as unknown) as DashboardtypesVariablePluginDTO;
	} else if (draft.kind === 'CUSTOM') {
		plugin = ({
			kind: 'signoz/CustomVariable',
			spec: { customValue: draft.customValue },
		} as unknown) as DashboardtypesVariablePluginDTO;
	} else if (draft.kind === 'DYNAMIC') {
		plugin = ({
			kind: 'signoz/DynamicVariable',
			spec: {
				name: draft.dynamicName,
				signal: draft.dynamicSignal,
			},
		} as unknown) as DashboardtypesVariablePluginDTO;
	}

	const spec: DashboardtypesListVariableSpecDTO = {
		name: draft.name,
		display,
		allowAllValue: draft.allowAllValue,
		allowMultiple: draft.allowMultiple,
		sort: draft.sort,
		plugin,
		// VariableDefaultValueDTO is an open `{[key]: unknown}` shape, so a bare
		// string isn't structurally assignable. We cast at the boundary.
		defaultValue: draft.defaultValue
			? ((draft.defaultValue as unknown) as DashboardtypesListVariableSpecDTO['defaultValue'])
			: undefined,
		customAllValue: draft.customAllValue || undefined,
		capturingRegexp: draft.capturingRegexp || undefined,
	};

	return ({
		kind: 'ListVariable',
		spec,
	} as unknown) as DashboardtypesVariableDTO;
}

export interface DraftValidationError {
	field:
		| 'name'
		| 'queryValue'
		| 'customValue'
		| 'dynamicName'
		| 'textValue'
		| 'cycle';
	message: string;
}

export function validateDraft(
	draft: VariableDraft,
	existingNames: string[],
): DraftValidationError | null {
	const trimmedName = draft.name.trim();
	if (!trimmedName) {
		return { field: 'name', message: 'Variable name is required' };
	}
	if (/\s/.test(trimmedName)) {
		return { field: 'name', message: 'Variable name cannot contain whitespace' };
	}
	if (existingNames.includes(trimmedName)) {
		return { field: 'name', message: 'Variable name already exists' };
	}

	if (draft.kind === 'QUERY' && !draft.queryValue.trim()) {
		return { field: 'queryValue', message: 'Query is required' };
	}
	if (draft.kind === 'CUSTOM' && !draft.customValue.trim()) {
		return { field: 'customValue', message: 'Custom values are required' };
	}
	if (draft.kind === 'DYNAMIC' && !draft.dynamicName.trim()) {
		return { field: 'dynamicName', message: 'Attribute name is required' };
	}
	if (draft.kind === 'TEXT' && !draft.textValue.trim()) {
		return { field: 'textValue', message: 'Default text value is required' };
	}
	return null;
}

export function getVariableName(dto: DashboardtypesVariableDTO): string {
	if (dto.kind === 'TextVariable') {
		return (dto.spec as DashboardTextVariableSpecDTO)?.name ?? '';
	}
	return (dto.spec as DashboardtypesListVariableSpecDTO)?.name ?? '';
}

export function getVariableKindLabel(dto: DashboardtypesVariableDTO): string {
	if (dto.kind === 'TextVariable') return 'Text';
	const spec = dto.spec as DashboardtypesListVariableSpecDTO;
	const pluginKind = spec?.plugin?.kind;
	if (pluginKind === 'signoz/DynamicVariable') return 'Dynamic';
	if (pluginKind === 'signoz/CustomVariable') return 'Custom';
	return 'Query';
}
