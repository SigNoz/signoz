import { useEffect, useRef } from 'react';
import { useQuerySearchOnRun } from 'components/QueryBuilderV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { parseAsString, useQueryState } from 'nuqs';

import { carryOverListFilters } from '../../Base/relations';
import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../../constants';

/**
 * Seeds the editable half of the filter with whatever the list page was
 * filtered by, reduced to the clauses the listed resource understands. Runs
 * once per resource, so it never overwrites what the user types, and stands
 * aside for a drawer opened from a link that already carries a filter.
 */
export function useCarriedOverFilters(
	targetCategory: InfraMonitoringEntity,
): void {
	const { currentQuery } = useQueryBuilder();
	const listExpression =
		currentQuery.builder.queryData[0]?.filter?.expression || '';
	const querySearchOnRun = useQuerySearchOnRun();

	const [urlExpression] = useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.OVERVIEW_EXPRESSION,
		parseAsString,
	);

	const seededFor = useRef<string | null>(null);
	const hadUrlExpressionOnMount = useRef<boolean | null>(null);
	if (hadUrlExpressionOnMount.current === null) {
		hadUrlExpressionOnMount.current = !!urlExpression;
	}

	useEffect(() => {
		if (seededFor.current === targetCategory) {
			return;
		}

		const isFirstResource = seededFor.current === null;
		seededFor.current = targetCategory;

		if (isFirstResource && hadUrlExpressionOnMount.current) {
			return;
		}

		querySearchOnRun(carryOverListFilters(listExpression, targetCategory));
	}, [targetCategory, listExpression, querySearchOnRun]);
}
