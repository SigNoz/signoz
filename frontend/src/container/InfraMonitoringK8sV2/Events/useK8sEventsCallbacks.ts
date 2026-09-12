import { useCallback } from 'react';
import {
	useInitialExpression,
	useInputExpression,
	useQuerySearchOnRun,
} from 'components/QueryBuilderV2';
import {
	combineInitialAndUserExpression,
	getUserExpressionFromCombined,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { saveRecentQueryByExpression } from 'lib/recentQueries/saveRecentQuery';
import { DataSource } from 'types/common/queryBuilder';
import { validateQuery } from 'utils/queryValidationUtils';

import { logInfraFilterCustomizedEvent } from '../Base/events';
import { InfraMonitoringEntity, K8sCategories } from '../constants';
import {
	useInfraMonitoringCategory,
	useInfraMonitoringSelectedItemParams,
} from '../hooks';
import { K8sEventRow } from './types';
import { getEventDrillDownTarget } from './utils';

interface UseK8sEventsCallbacksArgs {
	pageSize: number;
	refetch: () => void;
	setPagination: (value: { offset: number; limit: number } | null) => void;
}

interface UseK8sEventsCallbacksResult {
	handleRunQuery: (updatedExpression?: string) => void;
	handleDrillDown: (record: K8sEventRow) => void;
}

export function useK8sEventsCallbacks({
	pageSize,
	refetch,
	setPagination,
}: UseK8sEventsCallbacksArgs): UseK8sEventsCallbacksResult {
	const inputExpression = useInputExpression();
	const initialExpression = useInitialExpression();
	const querySearchOnRun = useQuerySearchOnRun();

	const [, setSelectedCategory] = useInfraMonitoringCategory();
	const [, setSelectedItemParams] = useInfraMonitoringSelectedItemParams();

	const handleRunQuery = useCallback(
		(updatedExpression?: string): void => {
			const newUserExpression = updatedExpression
				? getUserExpressionFromCombined(initialExpression, updatedExpression)
				: inputExpression;

			const validation = validateQuery(
				initialExpression
					? combineInitialAndUserExpression(initialExpression, newUserExpression)
					: newUserExpression || '',
			);
			if (!validation.isValid) {
				return;
			}

			saveRecentQueryByExpression(DataSource.LOGS, newUserExpression);
			querySearchOnRun(newUserExpression || '');
			setPagination({ offset: 0, limit: pageSize });

			// Events is a category without a metrics-backed entity, matching how
			// the page already reports quick-filter changes for it.
			logInfraFilterCustomizedEvent(
				K8sCategories.EVENTS as InfraMonitoringEntity,
				'search',
				newUserExpression || '',
			);

			refetch();
		},
		[
			inputExpression,
			initialExpression,
			querySearchOnRun,
			setPagination,
			pageSize,
			refetch,
		],
	);

	const handleDrillDown = useCallback(
		(record: K8sEventRow): void => {
			const target = getEventDrillDownTarget(record);
			if (!target) {
				return;
			}
			setSelectedItemParams(target.params);
			void setSelectedCategory(target.category);
		},
		[setSelectedCategory, setSelectedItemParams],
	);

	return { handleRunQuery, handleDrillDown };
}
