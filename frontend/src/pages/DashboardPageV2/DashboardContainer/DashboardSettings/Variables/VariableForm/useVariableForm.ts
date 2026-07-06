import { useEffect, useMemo, useState } from 'react';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';
import type { PayloadVariables } from 'types/api/dashboard/variables/query';

import type { VariableSelectionMap } from '../../../VariablesBar/selectionTypes';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { detectVariableCycle } from '../variableDependencies';
import {
	sortValuesByOrder,
	type VariableFormModel,
	type VariableType,
} from '../variableFormModel';
import { getAttributeError, getNameError } from './variableValidation';

// Stable reference so the zustand selector never returns a fresh object (which
// would make useSyncExternalStore loop) when this dashboard has no selections.
const EMPTY_SELECTIONS: VariableSelectionMap = {};

interface UseVariableFormArgs {
	initial: VariableFormModel;
	siblings: VariableFormModel[];
	isNew: boolean;
	onSave: (model: VariableFormModel) => void;
}

export interface UseVariableForm {
	model: VariableFormModel;
	set: (patch: Partial<VariableFormModel>) => void;
	onNameChange: (value: string) => void;
	selectType: (type: VariableType) => void;
	onCustomChange: (value: string) => void;
	onDynamicChange: (patch: Partial<VariableFormModel>) => void;
	setRawPreview: (values: (string | number)[]) => void;
	previewValues: (string | number)[];
	previewError: string | null;
	setPreviewError: (message: string | null) => void;
	defaultValue: string;
	setDefaultValue: (value: string) => void;
	visibleNameError: string | null;
	nameError: string | null;
	attributeError: string | undefined;
	cycleError: string | null;
	isListType: boolean;
	showAllOptionField: boolean;
	payloadVariables: PayloadVariables;
	handleSave: () => void;
}

const readDefaultValue = (model: VariableFormModel): string =>
	((model.defaultValue as { value?: string })?.value ?? '') as string;

/** Form state, derivations and handlers for the variable editor. */
export function useVariableForm({
	initial,
	siblings,
	isNew,
	onSave,
}: UseVariableFormArgs): UseVariableForm {
	const [model, setModel] = useState<VariableFormModel>(initial);
	// Raw, unsorted preview; `previewValues` applies the chosen sort so a shown
	// preview re-sorts when Sort changes.
	const [rawPreview, setRawPreview] = useState<(string | number)[]>([]);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [cycleError, setCycleError] = useState<string | null>(null);
	// In add mode, mirror the chosen attribute into the name until the user types.
	const [nameTouched, setNameTouched] = useState(false);
	const [defaultValue, setDefaultValue] = useState<string>(
		readDefaultValue(initial),
	);

	useEffect(() => {
		setModel(initial);
		setRawPreview([]);
		setPreviewError(null);
		setCycleError(null);
		setNameTouched(false);
		setDefaultValue(readDefaultValue(initial));
	}, [initial]);

	const set = (patch: Partial<VariableFormModel>): void =>
		setModel((prev) => ({ ...prev, ...patch }));

	const previewValues = useMemo(
		() => sortValuesByOrder(rawPreview, model.sort) as (string | number)[],
		[rawPreview, model.sort],
	);

	const existingNames = useMemo(() => siblings.map((v) => v.name), [siblings]);

	const existingDynamicAttributes = useMemo(
		() =>
			siblings
				.filter((v) => v.type === 'DYNAMIC' && v.dynamicAttribute)
				.map((v) => v.dynamicAttribute),
		[siblings],
	);

	// Sibling selections feed the Query "Test Run" so dependent `$vars` resolve.
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const selections = useDashboardStore(
		(s) => s.variableValues[dashboardId ?? ''] ?? EMPTY_SELECTIONS,
	);
	const payloadVariables = useMemo<PayloadVariables>(() => {
		const out: PayloadVariables = {};
		siblings.forEach((v) => {
			if (v.name) {
				out[v.name] = selections[v.name]?.value ?? null;
			}
		});
		return out;
	}, [siblings, selections]);

	const trimmedName = model.name.trim();
	const nameError = getNameError(trimmedName, existingNames, initial.name);
	// Surface the message only once the field is dirty; Save stays disabled regardless.
	const visibleNameError = nameTouched ? nameError : null;
	const attributeError = getAttributeError(model, existingDynamicAttributes);

	const isListType =
		model.type === 'QUERY' || model.type === 'CUSTOM' || model.type === 'DYNAMIC';
	const showAllOptionField = model.type === 'QUERY' || model.type === 'CUSTOM';

	const onNameChange = (value: string): void => {
		setNameTouched(true);
		set({ name: value });
	};

	const selectType = (type: VariableType): void => {
		set({ type });
		setRawPreview([]);
		setPreviewError(null);
	};

	const onCustomChange = (value: string): void => {
		set({ customValue: value });
		setRawPreview(commaValuesParser(value));
	};

	// In add mode, mirror the selected attribute into the name until the user
	// edits the name themselves (matches the V1 dynamic-variable behaviour).
	const onDynamicChange = (patch: Partial<VariableFormModel>): void => {
		if (isNew && !nameTouched && patch.dynamicAttribute) {
			set({ ...patch, name: patch.dynamicAttribute });
		} else {
			set(patch);
		}
	};

	const handleSave = (): void => {
		const next: VariableFormModel = {
			...model,
			name: trimmedName,
			defaultValue: defaultValue || undefined,
		};

		const cycle = detectVariableCycle([...siblings, next]);
		if (cycle) {
			setCycleError(
				`Cannot save: circular dependency detected between variables: ${cycle.join(
					' → ',
				)}`,
			);
			return;
		}
		setCycleError(null);
		onSave(next);
	};

	return {
		model,
		set,
		onNameChange,
		selectType,
		onCustomChange,
		onDynamicChange,
		setRawPreview,
		previewValues,
		previewError,
		setPreviewError,
		defaultValue,
		setDefaultValue,
		visibleNameError,
		nameError,
		attributeError,
		cycleError,
		isListType,
		showAllOptionField,
		payloadVariables,
		handleSave,
	};
}
