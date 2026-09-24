import { useCallback, useMemo, useState } from 'react';

import {
	ANY_RESOURCE_VALUE,
	DEFAULT_QUERY_TYPE,
	QueryTypeId,
	QueryTypeOption,
	SelectorValidation,
} from './TelemetrySelectorWizard.constants';
import {
	buildSelector,
	getDefaultSelector,
	getQueryTypeOption,
	isAnyResourceValue,
	parseSelector,
	validateSelector,
} from './TelemetrySelectorWizard.utils';

interface UseTelemetrySelectorWizardParams {
	onAdd: (selector: string) => void;
}

interface UseTelemetrySelectorWizardResult {
	open: boolean;
	queryType: QueryTypeId;
	selectedQueryType: QueryTypeOption | undefined;
	value: string;
	selector: string;
	isAnyResource: boolean;
	supportsKeyScoping: boolean;
	validation: SelectorValidation;
	canAdd: boolean;
	handleOpenChange: (nextOpen: boolean) => void;
	handleQueryTypeChange: (value: string | string[]) => void;
	handleValueChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleAnyResourceChange: (checked: boolean) => void;
	handleSelectorChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleAdd: () => void;
	handleInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

function useTelemetrySelectorWizard({
	onAdd,
}: UseTelemetrySelectorWizardParams): UseTelemetrySelectorWizardResult {
	const [open, setOpen] = useState(false);
	const [queryType, setQueryType] = useState<QueryTypeId>(DEFAULT_QUERY_TYPE);
	const [value, setValue] = useState('');
	const [selector, setSelector] = useState(() =>
		getDefaultSelector(DEFAULT_QUERY_TYPE),
	);

	const selectedQueryType = useMemo(
		() => getQueryTypeOption(queryType),
		[queryType],
	);
	const supportsKeyScoping = selectedQueryType?.supportsKeyScoping ?? false;

	const validation = useMemo(() => validateSelector(selector), [selector]);

	const applyDraft = useCallback(
		(nextQueryType: QueryTypeId, nextValue: string): void => {
			setQueryType(nextQueryType);
			setValue(nextValue);
			setSelector(buildSelector({ queryType: nextQueryType, value: nextValue }));
		},
		[],
	);

	const handleQueryTypeChange = useCallback(
		(next: string | string[]): void => {
			const selected = (Array.isArray(next) ? next[0] : next) as QueryTypeId;
			const keepsValue = getQueryTypeOption(selected)?.supportsKeyScoping ?? false;

			applyDraft(selected, keepsValue ? value : '');
		},
		[applyDraft, value],
	);

	const handleValueChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>): void => {
			applyDraft(queryType, event.target.value);
		},
		[applyDraft, queryType],
	);

	const handleAnyResourceChange = useCallback(
		(checked: boolean): void => {
			applyDraft(queryType, checked ? ANY_RESOURCE_VALUE : '');
		},
		[applyDraft, queryType],
	);

	const handleSelectorChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>): void => {
			const nextSelector = event.target.value;
			setSelector(nextSelector);

			const parsed = parseSelector(nextSelector);
			if (parsed.queryType) {
				setQueryType(parsed.queryType);
			}
			setValue(parsed.value);
		},
		[],
	);

	const handleOpenChange = useCallback((nextOpen: boolean): void => {
		setOpen(nextOpen);

		if (!nextOpen) {
			setQueryType(DEFAULT_QUERY_TYPE);
			setValue('');
			setSelector(getDefaultSelector(DEFAULT_QUERY_TYPE));
		}
	}, []);

	const handleAdd = useCallback((): void => {
		const trimmed = selector.trim();

		if (validateSelector(trimmed).isError) {
			return;
		}

		onAdd(trimmed);
		handleOpenChange(false);
	}, [selector, onAdd, handleOpenChange]);

	const handleInputKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>): void => {
			if (event.key === 'Enter') {
				handleAdd();
			}
		},
		[handleAdd],
	);

	return {
		open,
		queryType,
		selectedQueryType,
		value,
		selector,
		isAnyResource: isAnyResourceValue(value),
		supportsKeyScoping,
		validation,
		canAdd: !validation.isError,
		handleOpenChange,
		handleQueryTypeChange,
		handleValueChange,
		handleAnyResourceChange,
		handleSelectorChange,
		handleAdd,
		handleInputKeyDown,
	};
}

export default useTelemetrySelectorWizard;
