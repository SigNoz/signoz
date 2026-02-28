import { useState } from 'react';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import isEqual from 'lodash-es/isEqual';

export interface IDashboardsListQueryParams {
	columnKey: string;
	order: string;
	page: string;
	search: string;
}

export const DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY =
	'dashboardsListQueryParams';

const SUPPORTED_COLUMN_KEYS = ['createdAt', 'updatedAt'];
const SUPPORTED_ORDER_KEYS = ['ascend', 'descend'];

function useDashboardsListQueryParams(): {
	dashboardsListQueryParams: IDashboardsListQueryParams;
	updateDashboardsListQueryParams: (
		dashboardsListQueryParams: IDashboardsListQueryParams,
	) => void;
} {
	const { safeNavigate } = useSafeNavigate();
	const params = useUrlQuery();

	const orderColumnKeyQueryParam = params.get('columnKey');
	const orderQueryParam = params.get('order');
	const pageQueryParam = params.get('page');
	const searchQueryParam = params.get('search');

	const [
		dashboardsListQueryParams,
		setDashboardsListQueryParams,
	] = useState<IDashboardsListQueryParams>({
		columnKey:
			orderColumnKeyQueryParam &&
			SUPPORTED_COLUMN_KEYS.includes(orderColumnKeyQueryParam)
				? orderColumnKeyQueryParam
				: 'updatedAt',
		order:
			orderQueryParam && SUPPORTED_ORDER_KEYS.includes(orderQueryParam)
				? orderQueryParam
				: 'descend',
		page: pageQueryParam || '1',
		search: searchQueryParam || '',
	});

	function updateDashboardsListQueryParams(
		updatedQueryParams: IDashboardsListQueryParams,
	): void {
		if (!isEqual(updatedQueryParams, dashboardsListQueryParams)) {
			setDashboardsListQueryParams(updatedQueryParams);
		}

		params.set('columnKey', updatedQueryParams.columnKey);
		params.set('order', updatedQueryParams.order);
		params.set('page', updatedQueryParams.page || '1');
		params.set('search', updatedQueryParams.search || '');

		const queryParamsString = params.toString();

		sessionStorage.setItem(
			DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY,
			queryParamsString,
		);
		safeNavigate({ search: queryParamsString });
	}

	return { dashboardsListQueryParams, updateDashboardsListQueryParams };
}

export default useDashboardsListQueryParams;
