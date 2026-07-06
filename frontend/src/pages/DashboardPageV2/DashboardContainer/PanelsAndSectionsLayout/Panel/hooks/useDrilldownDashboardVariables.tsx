import { useCallback, useMemo } from 'react';
import { toast } from '@signozhq/ui/sonner';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { FilterData } from 'container/QueryTable/Drilldown/drilldownUtils';
import { useQueryState } from 'nuqs';
import {
	dtoToFormModel,
	formModelToDto,
} from 'pages/DashboardPageV2/DashboardContainer/DashboardSettings/Variables/variableAdapters';
import {
	DYNAMIC_SIGNAL_ALL,
	emptyVariableFormModel,
	type VariableFormModel,
} from 'pages/DashboardPageV2/DashboardContainer/DashboardSettings/Variables/variableFormModel';
import { buildVariablesPatch } from 'pages/DashboardPageV2/DashboardContainer/DashboardSettings/Variables/variablePatchOps';
import { useDashboardFetchRequired } from 'pages/DashboardPageV2/DashboardContainer/hooks/useDashboardFetchRequired';
import { useOptimisticPatch } from 'pages/DashboardPageV2/DashboardContainer/hooks/useOptimisticPatch';
import { selectVariableValues } from 'pages/DashboardPageV2/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';
import type { VariableSelection } from 'pages/DashboardPageV2/DashboardContainer/VariablesBar/selectionTypes';
import {
	ALL_SELECTED,
	variablesUrlParser,
} from 'pages/DashboardPageV2/DashboardContainer/VariablesBar/useVariableSelection';

interface UseDrilldownDashboardVariablesArgs {
	/** Group-by field filters from the clicked point (empty when the click has no group-by). */
	filters: FilterData[];
	/** Clicked query's telemetry signal — seeds a created variable's `dynamicSignal`. */
	signal?: TelemetrytypesSignalDTO;
	/** Close the popover after an action. */
	onClose: () => void;
}

/** Set/Unset a matching dynamic variable's value, or Create one when none matches. */
export enum DrilldownVariableActionKind {
	Set = 'set',
	Unset = 'unset',
	Create = 'create',
}

/** A resolved "Dashboard Variables" menu entry; the caller renders it. */
export interface DrilldownVariableAction {
	fieldName: string;
	fieldValue: string | number;
	kind: DrilldownVariableActionKind;
	/** Applies the action and closes the popover. */
	onClick: () => void;
}

export interface UseDrilldownDashboardVariablesApi {
	/** Whether the clicked point exposes any field to bind to a variable (gates the base-menu entry). */
	hasFieldVariables: boolean;
	/** Resolved menu entries, one per group-by field on the clicked point. */
	actions: DrilldownVariableAction[];
}

/**
 * "Dashboard Variables" submenu logic (V1 `useDashboardVarConfig` parity). Set/Unset are runtime-only
 * (store + URL — V2 selections don't persist); Create is the one path that patches `spec.variables`.
 */
export function useDrilldownDashboardVariables({
	filters,
	signal,
	onClose,
}: UseDrilldownDashboardVariablesArgs): UseDrilldownDashboardVariablesApi {
	const dashboardId = useDashboardStore((state) => state.dashboardId);
	const { variables } = useDashboardFetchRequired();

	const dynamicVariables = useMemo(
		() => variables.map(dtoToFormModel).filter((v) => v.type === 'DYNAMIC'),
		[variables],
	);
	const existingNames = useMemo(
		() => new Set(variables.map((v) => dtoToFormModel(v).name)),
		[variables],
	);

	const selection = useDashboardStore(selectVariableValues(dashboardId));
	const setVariableValue = useDashboardStore((state) => state.setVariableValue);
	const [, setUrlValues] = useQueryState(
		'variables',
		variablesUrlParser.withOptions({ history: 'replace' }),
	);
	const { patchAsync } = useOptimisticPatch();

	const fieldVariables = useMemo<[string, string | number][]>(
		() =>
			filters
				.filter(
					(f) => f.filterKey && f.filterValue !== undefined && f.filterValue !== '',
				)
				.map((f) => [f.filterKey, f.filterValue]),
		[filters],
	);

	// Runtime-only write (store + URL), never the spec — mirrors VariablesBar's setSelection.
	const setSelection = useCallback(
		(name: string, next: VariableSelection): void => {
			setVariableValue(dashboardId, name, next);
			void setUrlValues((prev) => ({
				...(prev ?? {}),
				[name]: next.allSelected ? ALL_SELECTED : next.value,
			}));
		},
		[dashboardId, setVariableValue, setUrlValues],
	);

	const handleCreate = useCallback(
		async (fieldName: string, fieldValue: string | number): Promise<void> => {
			if (existingNames.has(fieldName)) {
				toast.error(`Variable "${fieldName}" already exists`);
				return;
			}
			const model: VariableFormModel = {
				...emptyVariableFormModel(),
				name: fieldName,
				description: `Created from panel drilldown (field: ${fieldName})`,
				type: 'DYNAMIC',
				multiSelect: true,
				dynamicAttribute: fieldName,
				dynamicSignal: signal ?? DYNAMIC_SIGNAL_ALL,
			};
			try {
				await patchAsync(
					buildVariablesPatch([...variables, formModelToDto(model)]),
				);
				// Multi-select var → seed the value as an array (the selector renders scalars as empty).
				setSelection(fieldName, { value: [fieldValue], allSelected: false });
				toast.success(`Created variable "${fieldName}"`);
			} catch {
				toast.error('Failed to create variable');
			}
			onClose();
		},
		[existingNames, signal, variables, patchAsync, setSelection, onClose],
	);

	const actions = useMemo<DrilldownVariableAction[]>(
		() =>
			fieldVariables.map(([fieldName, fieldValue]) => {
				const existing = dynamicVariables.find(
					(v) => v.dynamicAttribute === fieldName,
				);
				if (!existing) {
					return {
						fieldName,
						fieldValue,
						kind: DrilldownVariableActionKind.Create,
						onClick: (): void => {
							void handleCreate(fieldName, fieldValue);
						},
					};
				}

				const current = selection[existing.name]?.value;
				const isSame = Array.isArray(current)
					? current.length === 1 && current[0] === fieldValue
					: current === fieldValue;

				// Multi-select values must be arrays (a scalar renders as empty in the selector).
				const cleared = existing.multiSelect ? [] : '';
				const assigned = existing.multiSelect ? [fieldValue] : fieldValue;

				return {
					fieldName,
					fieldValue,
					kind: isSame
						? DrilldownVariableActionKind.Unset
						: DrilldownVariableActionKind.Set,
					onClick: (): void => {
						setSelection(existing.name, {
							value: isSame ? cleared : assigned,
							allSelected: false,
						});
						onClose();
					},
				};
			}),
		[
			fieldVariables,
			dynamicVariables,
			selection,
			setSelection,
			handleCreate,
			onClose,
		],
	);

	return { hasFieldVariables: fieldVariables.length > 0, actions };
}
