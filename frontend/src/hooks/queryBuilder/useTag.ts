import { INFRA_SHORT_TO_LONG_OPERATOR_MAP } from 'constants/queryBuilder';
import {
	getOperatorFromValue,
	isInNInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearchV2/utils';
import { unparse } from 'papaparse';
import type { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

/**
 * Helper for formatting a TagFilter object into filter item strings
 * @param {TagFilter} filters - query filter object to be converted
 * @param {boolean} isInfraMonitoring - whether to use long form operator display
 * @returns {string[]} An array of formatted conditions. Eg: `["service = web", "severity_text = INFO"]`)
 */
export function queryFilterTags(
	filter: TagFilter,
	isInfraMonitoring?: boolean,
): string[] {
	return (filter?.items || []).map((ele) => {
		const rawOp = getOperatorFromValue(ele.op);
		const displayOp =
			isInfraMonitoring && INFRA_SHORT_TO_LONG_OPERATOR_MAP[rawOp]
				? INFRA_SHORT_TO_LONG_OPERATOR_MAP[rawOp]
				: rawOp;

		if (isInNInOperator(rawOp)) {
			try {
				const csvString = unparse([ele.value]);
				return `${ele.key?.key} ${displayOp} ${csvString}`;
			} catch {
				return `${ele.key?.key} ${displayOp} ${ele.value}`;
			}
		}
		return `${ele.key?.key} ${displayOp} ${ele.value}`;
	});
}
