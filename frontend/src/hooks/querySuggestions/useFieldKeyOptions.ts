import { useEffect, useMemo, useRef } from 'react';
import { FieldKeysConfig } from 'api/querySuggestions/types';
import { BuilderQueryType } from 'types/api/v5/queryRange';
import {
	getFieldKeyLabel,
	matchesFieldContextPrefix,
} from 'utils/fieldKeyContext';

import { useFieldKeysSuggestion } from './useFieldKeysSuggestion';

export interface FieldKeyOption {
	label: string;
	name: string;
}

const NO_EXCLUDED_NAMES: readonly string[] = [];

interface UseFieldKeyOptionsParams {
	fieldKeysConfig: FieldKeysConfig;
	builderQueryType?: BuilderQueryType;
	enabled: boolean;
	excludeNames?: readonly string[];
}

// Deduped key rows for group-by / order-by pickers. A row keeps only label and name:
// one label can stand for several fieldContext / fieldDataType variants.
// Previous results stay while the next search loads, filtered to the typed context.
export const useFieldKeyOptions = ({
	fieldKeysConfig,
	builderQueryType,
	enabled,
	excludeNames = NO_EXCLUDED_NAMES,
}: UseFieldKeyOptionsParams): {
	options: FieldKeyOption[];
	isFetching: boolean;
} => {
	// A previous result is reusable across search text within one signal / source /
	// metric; a change of any of those starts from empty until its own result lands.
	const scope = `${fieldKeysConfig.signal ?? ''}|${fieldKeysConfig.source ?? ''}|${
		fieldKeysConfig.metricName ?? ''
	}`;
	const settledScopeRef = useRef(scope);
	const keepPreviousData = settledScopeRef.current === scope;

	const { data, isFetching, isSuccess, isPreviousData } = useFieldKeysSuggestion(
		fieldKeysConfig,
		builderQueryType,
		{ enabled, keepPreviousData },
	);
	useEffect(() => {
		if (isSuccess && !isPreviousData) {
			settledScopeRef.current = scope;
		}
	}, [isSuccess, isPreviousData, scope]);
	const searchText = fieldKeysConfig.searchText ?? '';

	const options = useMemo(() => {
		const excluded = new Set(excludeNames);
		const seen = new Set<string>();
		const result: FieldKeyOption[] = [];

		(data ?? []).forEach((key) => {
			if (
				excluded.has(key.name) ||
				!matchesFieldContextPrefix(key.fieldContext, searchText)
			) {
				return;
			}
			const label = getFieldKeyLabel(key.name, searchText);
			if (seen.has(label)) {
				return;
			}
			seen.add(label);
			result.push({ label, name: key.name });
		});

		return result;
	}, [data, searchText, excludeNames]);

	return { options, isFetching };
};
