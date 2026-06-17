import {
	DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind as TextEnvelopeKind,
	DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind as ListEnvelopeKind,
	DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind as CustomPluginKind,
	DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind as DynamicPluginKind,
	DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind as QueryPluginKind,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	DashboardtypesListVariableSpecDTO,
	DashboardtypesVariableDTO,
	DashboardtypesVariablePluginDTO,
	DashboardtypesTextVariableSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	emptyVariableFormModel,
	PLUGIN_KIND,
	type TelemetrySignal,
	type VariableFormModel,
	type VariableSort,
} from './variableModel';

/** DTO envelope → flat form model (for display / editing). */
export function dtoToFormModel(
	dto: DashboardtypesVariableDTO,
): VariableFormModel {
	const base = emptyVariableFormModel();
	const display = dto.spec?.display;
	const common: VariableFormModel = {
		...base,
		name: dto.spec?.name ?? display?.name ?? '',
		description: display?.description ?? '',
	};

	// Text variable — a distinct envelope (no list plugin).
	if (dto.kind === TextEnvelopeKind.TextVariable) {
		const spec = dto.spec as DashboardtypesTextVariableSpecDTO;
		return {
			...common,
			type: 'TEXT',
			textValue: spec.value ?? '',
			textConstant: spec.constant ?? false,
		};
	}

	// List variable — Query / Custom / Dynamic, distinguished by plugin.kind.
	const spec = dto.spec as DashboardtypesListVariableSpecDTO;
	const listCommon: VariableFormModel = {
		...common,
		multiSelect: spec.allowMultiple ?? false,
		showAllOption: spec.allowAllValue ?? false,
		sort: (spec.sort as VariableSort) ?? 'DISABLED',
		defaultValue: spec.defaultValue,
	};
	const plugin = spec.plugin;

	if (plugin?.kind === CustomPluginKind['signoz/CustomVariable']) {
		return {
			...listCommon,
			type: 'CUSTOM',
			customValue: plugin.spec.customValue ?? '',
		};
	}
	if (plugin?.kind === DynamicPluginKind['signoz/DynamicVariable']) {
		return {
			...listCommon,
			type: 'DYNAMIC',
			dynamicAttribute: plugin.spec.name ?? '',
			dynamicSignal: (plugin.spec.signal as TelemetrySignal) ?? 'traces',
		};
	}
	// Default to Query (also covers a query plugin or a missing/unknown plugin).
	return {
		...listCommon,
		type: 'QUERY',
		queryValue:
			plugin?.kind === QueryPluginKind['signoz/QueryVariable']
				? (plugin.spec.queryValue ?? '')
				: '',
	};
}

function buildPlugin(
	model: VariableFormModel,
): DashboardtypesVariablePluginDTO {
	switch (model.type) {
		case 'CUSTOM':
			return {
				kind: CustomPluginKind['signoz/CustomVariable'],
				spec: { customValue: model.customValue },
			};
		case 'DYNAMIC':
			return {
				kind: DynamicPluginKind['signoz/DynamicVariable'],
				spec: {
					name: model.dynamicAttribute,
					signal: model.dynamicSignal as TelemetrytypesSignalDTO,
				},
			};
		case 'QUERY':
		default:
			return {
				kind: QueryPluginKind['signoz/QueryVariable'],
				spec: { queryValue: model.queryValue },
			};
	}
}

/** Flat form model → DTO envelope (for persistence). */
export function formModelToDto(
	model: VariableFormModel,
): DashboardtypesVariableDTO {
	const display = {
		name: model.name,
		description: model.description,
		hidden: model.hidden,
	};

	if (model.type === 'TEXT') {
		return {
			kind: TextEnvelopeKind.TextVariable,
			spec: {
				name: model.name,
				display,
				value: model.textValue,
				constant: model.textConstant,
			},
		};
	}

	return {
		kind: ListEnvelopeKind.ListVariable,
		spec: {
			name: model.name,
			display,
			allowMultiple: model.multiSelect,
			allowAllValue: model.showAllOption,
			sort: model.sort,
			defaultValue: model.defaultValue,
			plugin: buildPlugin(model),
		},
	};
}

/** Maps the V2 plugin/envelope to the four UI-facing variable types. */
export function variableTypeOf(
	dto: DashboardtypesVariableDTO,
): VariableFormModel['type'] {
	return dtoToFormModel(dto).type;
}

export { PLUGIN_KIND };
