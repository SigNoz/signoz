import { useCallback, useMemo, useState } from 'react';

import {
	ANY_RESOURCE_VALUE,
	DEFAULT_GRANT_KEY,
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
	isSupportedGrantKey,
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
	grantKey: string;
	value: string;
	selector: string;
	isAnyResource: boolean;
	supportsKeyScoping: boolean;
	validation: SelectorValidation;
	canAdd: boolean;
	handleOpenChange: (nextOpen: boolean) => void;
	handleQueryTypeChange: (value: string | string[]) => void;
	handleKeyChange: (value: string | string[]) => void;
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
	const [grantKey, setGrantKey] = useState(DEFAULT_GRANT_KEY);
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
		(nextQueryType: QueryTypeId, nextKey: string, nextValue: string): void => {
			setQueryType(nextQueryType);
			setGrantKey(nextKey);
			setValue(nextValue);
			setSelector(
				buildSelector({
					queryType: nextQueryType,
					key: nextKey,
					value: nextValue,
				}),
			);
		},
		[],
	);

	const handleQueryTypeChange = useCallback(
		(next: string | string[]): void => {
			const selected = (Array.isArray(next) ? next[0] : next) as QueryTypeId;
			const keepsValue = getQueryTypeOption(selected)?.supportsKeyScoping ?? false;

			applyDraft(selected, grantKey, keepsValue ? value : '');
		},
		[applyDraft, grantKey, value],
	);

	const handleKeyChange = useCallback(
		(next: string | string[]): void => {
			applyDraft(queryType, Array.isArray(next) ? next[0] : next, value);
		},
		[applyDraft, queryType, value],
	);

	const handleValueChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>): void => {
			applyDraft(queryType, grantKey, event.target.value);
		},
		[applyDraft, queryType, grantKey],
	);

	const handleAnyResourceChange = useCallback(
		(checked: boolean): void => {
			applyDraft(queryType, grantKey, checked ? ANY_RESOURCE_VALUE : '');
		},
		[applyDraft, queryType, grantKey],
	);

	const handleSelectorChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>): void => {
			const nextSelector = event.target.value;
			setSelector(nextSelector);

			const parsed = parseSelector(nextSelector);
			if (parsed.queryType) {
				setQueryType(parsed.queryType);
			}
			if (parsed.key && isSupportedGrantKey(parsed.key)) {
				setGrantKey(parsed.key);
			}
			setValue(parsed.value);
		},
		[],
	);

	const handleOpenChange = useCallback((nextOpen: boolean): void => {
		setOpen(nextOpen);

		if (!nextOpen) {
			setQueryType(DEFAULT_QUERY_TYPE);
			setGrantKey(DEFAULT_GRANT_KEY);
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
		grantKey,
		value,
		selector,
		isAnyResource: isAnyResourceValue(value),
		supportsKeyScoping,
		validation,
		canAdd: !validation.isError,
		handleOpenChange,
		handleQueryTypeChange,
		handleKeyChange,
		handleValueChange,
		handleAnyResourceChange,
		handleSelectorChange,
		handleAdd,
		handleInputKeyDown,
	};
}

export default useTelemetrySelectorWizard;
