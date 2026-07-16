import type {
	Querybuildertypesv5QueryRangeRequestDTOVariables,
	Querybuildertypesv5VariableItemDTOValue,
} from 'api/generated/services/sigNoz.schemas';
import { Querybuildertypesv5VariableTypeDTO } from 'api/generated/services/sigNoz.schemas';

import type {
	VariableFormModel,
	VariableType,
} from '../DashboardSettings/Variables/variableFormModel';
import { configuredDefaultValue } from '../VariablesBar/utils/resolveVariableSelection';
import type {
	VariableSelection,
	VariableSelectionMap,
} from '../VariablesBar/selectionTypes';

/**
 * Backend sentinel for "every value selected" on a multi-select dynamic variable.
 * V1 parity (`getDashboardVariables`): only dynamic vars collapse to `__all__`;
 * query/custom multi-selects send the full value array instead. Lowercase — the
 * URL/store `__ALL__` sentinel is a separate serialization concern.
 */
const ALL_VALUES_SENTINEL = '__all__';

/** UI variable grouping → the V5 wire `variables[].type`. */
const VARIABLE_TYPE_TO_DTO: Record<
	VariableType,
	Querybuildertypesv5VariableTypeDTO
> = {
	QUERY: Querybuildertypesv5VariableTypeDTO.query,
	CUSTOM: Querybuildertypesv5VariableTypeDTO.custom,
	TEXT: Querybuildertypesv5VariableTypeDTO.text,
	DYNAMIC: Querybuildertypesv5VariableTypeDTO.dynamic,
};

/**
 * Resolves the wire value for one variable: the dynamic "ALL" sentinel, else the
 * user's selection, else the configured default. Returns `undefined` when there
 * is nothing meaningful to send (the variable is then omitted from the payload).
 */
function resolveValue(
	definition: VariableFormModel,
	selection: VariableSelection | undefined,
): Querybuildertypesv5VariableItemDTOValue | undefined {
	if (
		definition.type === 'DYNAMIC' &&
		definition.multiSelect &&
		selection?.allSelected
	) {
		return ALL_VALUES_SENTINEL;
	}

	const selected = selection?.value;
	const hasSelection =
		selected !== null &&
		selected !== undefined &&
		!(typeof selected === 'string' && selected === '');
	if (hasSelection) {
		return selected as Querybuildertypesv5VariableItemDTOValue;
	}

	const fallback = configuredDefaultValue(definition);
	return fallback == null
		? undefined
		: (fallback as Querybuildertypesv5VariableItemDTOValue);
}

/**
 * Builds the V5 `variables` map from the dashboard's variable definitions and the
 * runtime selection, so a panel query substitutes the values the user picked in
 * the variable bar (V1 parity with `getDashboardVariables` + the V5 prep). The
 * definition list supplies the wire `type` (the selection map carries only values).
 */
export function buildVariablesPayload(
	definitions: VariableFormModel[],
	selection: VariableSelectionMap,
): Querybuildertypesv5QueryRangeRequestDTOVariables {
	const payload: Querybuildertypesv5QueryRangeRequestDTOVariables = {};
	definitions.forEach((definition) => {
		if (!definition.name) {
			return;
		}
		const value = resolveValue(definition, selection[definition.name]);
		if (value === undefined) {
			return;
		}
		payload[definition.name] = {
			type: VARIABLE_TYPE_TO_DTO[definition.type],
			value,
		};
	});
	return payload;
}
