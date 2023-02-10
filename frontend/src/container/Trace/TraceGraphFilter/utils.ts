import { DefaultOptionType } from 'antd/es/select';
import { ReactNode } from 'react';
import store from 'store';
import {
	UPDATE_SELECTED_FUNCTION,
	UPDATE_SELECTED_GROUP_BY,
} from 'types/actions/trace';
import { PayloadProps } from 'types/api/trace/getTagFilters';

import { extractTagFilters } from '../Search/AllTags/Tag/utils';
import { functions, groupBy } from './config';

export function groupByValues(
	tagFilters: DefaultOptionType[],
): DefaultOptionType[] {
	const result: DefaultOptionType[] = [...groupBy];
	tagFilters.forEach((e) => {
		result.push(e);
	});
	return result;
}

export function initOptions(
	payload: PayloadProps | null | undefined,
): DefaultOptionType[] {
	if (payload) {
		return groupByValues(extractTagFilters(payload));
	}
	return groupBy;
}

export function onClickSelectedGroupByHandler(options: DefaultOptionType[]) {
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
	options: DefaultOptionType[],
): ReactNode {
	const optionValue = options.find((e) => selectedGroupBy === e.value)?.label;
	if (optionValue) {
		return optionValue;
	}
	return selectedGroupBy;
}

export function getSelectedValue(selectedFunction: string): unknown {
	return functions.find((e) => selectedFunction === e.key)?.displayValue;
}

export function filterGroupBy(
	inputValue: string,
	option: DefaultOptionType | undefined,
): boolean {
	return (
		option?.label?.toString().toUpperCase().indexOf(inputValue.toUpperCase()) !==
		-1
	);
}
