import { ReactNode } from 'react';
import type { ComboboxSimpleItem } from '@signozhq/ui/combobox';
import store from 'store';
import {
	UPDATE_SELECTED_FUNCTION,
	UPDATE_SELECTED_GROUP_BY,
} from 'types/actions/trace';
import { PayloadProps } from 'types/api/trace/getTagFilters';

import { extractTagFilters } from '../Search/AllTags/Tag/utils';
import { functions, groupBy } from './config';

export function groupByValues(
	tagFilters: ComboboxSimpleItem[],
): ComboboxSimpleItem[] {
	const result: ComboboxSimpleItem[] = [...groupBy];
	tagFilters.forEach((e) => {
		result.push(e);
	});
	return result;
}

export function initOptions(
	payload: PayloadProps | null | undefined,
): ComboboxSimpleItem[] {
	if (payload) {
		return groupByValues(extractTagFilters(payload));
	}
	return groupBy;
}

export function onClickSelectedGroupByHandler(options: ComboboxSimpleItem[]) {
	return (ev: unknown): void => {
		const { dispatch } = store;
		if (typeof ev === 'string' && options) {
			const selected = options.find((e) => e.value === ev);
			if (selected) {
				dispatch({
					type: UPDATE_SELECTED_GROUP_BY,
					payload: {
						selectedGroupBy: selected.value ? selected.value.toString() : '',
					},
				});
			}
		}
	};
}

export function onClickSelectedFunctionHandler(value: unknown): void {
	const { dispatch } = store;
	if (typeof value === 'string') {
		const selected = functions.find((e) => e.key === value);
		if (selected) {
			dispatch({
				type: UPDATE_SELECTED_FUNCTION,
				payload: {
					selectedFunction: selected.key,
					yAxisUnit: selected.yAxisUnit,
				},
			});
		}
	}
}

export function selectedGroupByValue(
	selectedGroupBy: string,
	options: ComboboxSimpleItem[],
): ReactNode {
	const optionValue = options.find((e) => selectedGroupBy === e.value)?.label;
	if (optionValue) {
		return optionValue;
	}
	return selectedGroupBy;
}

export function getSelectedValue(selectedFunction: string): string {
	return selectedFunction;
}

export function filterGroupBy(
	inputValue: string,
	option: ComboboxSimpleItem | undefined,
): boolean {
	return (
		option?.label?.toString().toUpperCase().indexOf(inputValue.toUpperCase()) !==
		-1
	);
}
