import { DefaultOptionType } from 'antd/es/select';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
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

export function onClickSelectedGroupByHandler(
	options: DefaultOptionType[],
	dispatch: Dispatch<AppActions>,
) {
	return (ev: unknown): void => {
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

export function onClickSelectedFunctionHandler(dispatch: Dispatch<AppActions>) {
	return (ev: unknown): void => {
		if (typeof ev === 'string') {
			const selected = functions.find((e) => e.key === ev);
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
	};
}
export function selectedGroupByValue(selectedGroupBy: string): unknown {
	return groupBy.find((e) => selectedGroupBy === e.value)?.label;
}

export function functionValue(selectedFunction: string): unknown {
	return functions.find((e) => selectedFunction === e.key)?.displayValue;
}
