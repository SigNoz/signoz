import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Plus, Settings, X } from '@signozhq/icons';
import { toast } from '@signozhq/ui/sonner';
import { useGetDashboardV2 } from 'api/generated/services/dashboard';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { useQueryState } from 'nuqs';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
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
import { useOptimisticPatch } from 'pages/DashboardPageV2/DashboardContainer/hooks/useOptimisticPatch';
import { selectVariableValues } from 'pages/DashboardPageV2/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';
import type { VariableSelection } from 'pages/DashboardPageV2/DashboardContainer/VariablesBar/selectionTypes';
import {
	ALL_SELECTED,
	variablesUrlParser,
} from 'pages/DashboardPageV2/DashboardContainer/VariablesBar/useVariableSelection';
import ContextMenu from 'periscope/components/ContextMenu';

interface UseDrilldownDashboardVariablesArgs {
	context: DrilldownContext | null;
	/** Return to the base aggregate menu. */
	onBack: () => void;
	/** Close the popover after an action. */
	onClose: () => void;
}

export interface UseDrilldownDashboardVariablesApi {
	/** Whether the clicked point exposes any field to bind to a variable (gates the base-menu entry). */
	hasFieldVariables: boolean;
	/** The "Dashboard Variables" submenu content. */
	items: ReactNode;
}

/**
 * The "Dashboard Variables" drilldown submenu — V1 `useDashboardVarConfig` parity. For each group-by
 * field on the clicked point it offers, against a matching dynamic variable, Set/Unset the value, or
 * Create the variable when none matches. Set/Unset are runtime-only (store + URL, never the spec, as
 * V2 selections don't persist); Create is the one persisted path — it appends a dynamic variable to
 * `spec.variables`.
 */
export function useDrilldownDashboardVariables({
	context,
	onBack,
	onClose,
}: UseDrilldownDashboardVariablesArgs): UseDrilldownDashboardVariablesApi {
	const dashboardId = useDashboardStore((state) => state.dashboardId);
	const { data } = useGetDashboardV2(
		{ id: dashboardId },
		{ query: { enabled: !!dashboardId } },
	);
	const variables = data?.data.spec?.variables;

	const dynamicVariables = useMemo(
		() =>
			(variables ?? []).map(dtoToFormModel).filter((v) => v.type === 'DYNAMIC'),
		[variables],
	);
	const existingNames = useMemo(
		() => new Set((variables ?? []).map((v) => dtoToFormModel(v).name)),
		[variables],
	);

	const selection = useDashboardStore(selectVariableValues(dashboardId));
	const setVariableValue = useDashboardStore((state) => state.setVariableValue);
	const [, setUrlValues] = useQueryState(
		'variables',
		variablesUrlParser.withOptions({ history: 'replace' }),
	);
	const { patchAsync } = useOptimisticPatch();

	// Group-by field values on the clicked point — the candidates to bind to a variable. In V2 the
	// enriched filters are already the clicked series'/row's group-by keys (V1 intersected manually).
	const fieldVariables = useMemo<[string, string | number][]>(
		() =>
			(context?.filters ?? [])
				.filter(
					(f) => f.filterKey && f.filterValue !== undefined && f.filterValue !== '',
				)
				.map((f) => [f.filterKey, f.filterValue]),
		[context?.filters],
	);

	// Runtime selection write — store + URL, mirroring VariablesBar's setSelection (no spec write).
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
				dynamicSignal: context?.signal ?? DYNAMIC_SIGNAL_ALL,
			};
			try {
				await patchAsync(
					buildVariablesPatch([...(variables ?? []), formModelToDto(model)]),
				);
				// Seed the new variable's runtime value to what was clicked. The created var is
				// multi-select, so the value must be an array (the selector renders scalars as empty).
				setSelection(fieldName, { value: [fieldValue], allSelected: false });
				toast.success(`Created variable "${fieldName}"`);
			} catch {
				toast.error('Failed to create variable');
			}
			onClose();
		},
		[
			existingNames,
			context?.signal,
			variables,
			patchAsync,
			setSelection,
			onClose,
		],
	);

	const contextItems = useMemo<JSX.Element>(
		() => (
			<>
				{fieldVariables.map(([fieldName, fieldValue]) => {
					const existing = dynamicVariables.find(
						(v) => v.dynamicAttribute === fieldName,
					);

					if (existing) {
						const current = selection[existing.name]?.value;
						const isSame = Array.isArray(current)
							? current.length === 1 && current[0] === fieldValue
							: current === fieldValue;

						if (isSame) {
							return (
								<ContextMenu.Item
									key={fieldName}
									icon={<X size={16} />}
									onClick={(): void => {
										setSelection(existing.name, {
											value: existing.multiSelect ? [] : '',
											allSelected: false,
										});
										onClose();
									}}
								>
									<span data-testid="drilldown-var-unset">
										Unset <strong>${fieldName}</strong>
									</span>
								</ContextMenu.Item>
							);
						}
						return (
							<ContextMenu.Item
								key={fieldName}
								icon={<Settings size={16} />}
								onClick={(): void => {
									// Match the variable's shape: a multi-select selector renders a scalar
									// value as empty, so wrap it in an array.
									setSelection(existing.name, {
										value: existing.multiSelect ? [fieldValue] : fieldValue,
										allSelected: false,
									});
									onClose();
								}}
							>
								<span data-testid="drilldown-var-set">
									Set <strong>${fieldName}</strong> to <strong>{fieldValue}</strong>
								</span>
							</ContextMenu.Item>
						);
					}

					return (
						<ContextMenu.Item
							key={fieldName}
							icon={<Plus size={16} />}
							onClick={(): void => {
								void handleCreate(fieldName, fieldValue);
							}}
						>
							<span data-testid="drilldown-var-create">
								Create var <strong>${fieldName}</strong>:<strong>{fieldValue}</strong>
							</span>
						</ContextMenu.Item>
					);
				})}
			</>
		),
		[
			fieldVariables,
			dynamicVariables,
			selection,
			setSelection,
			handleCreate,
			onClose,
		],
	);

	const items = useMemo<ReactNode>(
		() => (
			<>
				<ContextMenu.Header>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<ArrowLeft size={14} style={{ cursor: 'pointer' }} onClick={onBack} />
						<span>Dashboard Variables</span>
					</div>
				</ContextMenu.Header>
				<OverlayScrollbar
					style={{ maxHeight: '200px' }}
					options={{ overflow: { x: 'hidden' } }}
				>
					{contextItems}
				</OverlayScrollbar>
			</>
		),
		[contextItems, onBack],
	);

	return { hasFieldVariables: fieldVariables.length > 0, items };
}
