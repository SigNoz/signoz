import { DefaultOptionType } from 'antd/es/select';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/trace/getTagFilters';

import { extractTagFilters } from '../Search/AllTags/Tag/utils';
import { groupBy } from './config';

export function groupByValues(
	tagFilters: DefaultOptionType[],
): DefaultOptionType[] {
	tagFilters.forEach((e) => {
		groupBy.push(e);
	});
	return groupBy;
}

export function initOptions(
	data: SuccessResponse<PayloadProps> | ErrorResponse | undefined,
): DefaultOptionType[] {
	if (data && data.payload != null) {
		return groupByValues(
			extractTagFilters(data?.payload).map((e) => ({
				value: e,
				label: e,
			})),
		);
	}
	return groupBy.map((e) => ({
		value: e.value,
		label: e.label,
	}));
}
