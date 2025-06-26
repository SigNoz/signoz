import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';

export interface DrilldownQueryProps {
	widget: Widgets;
	setRequestData: Dispatch<SetStateAction<GetQueryResultsProps>>;
	enableDrillDown: boolean;
	selectedDashboard: Dashboard | undefined;
}

export interface UseDrilldownReturn {
	dashboardEditView: string;
}

const useDrilldown = ({
	enableDrillDown,
	widget,
	setRequestData,
	selectedDashboard,
}: DrilldownQueryProps): UseDrilldownReturn => {
	const isMounted = useRef(false);
	const { redirectWithQueryBuilderData, currentQuery } = useQueryBuilder();
	const compositeQueryExists = !!useGetCompositeQueryParam();

	useEffect(() => {
		if (enableDrillDown && compositeQueryExists) {
			setRequestData((prev) => ({
				...prev,
				query: currentQuery,
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentQuery]);

	// update composite query with widget query if composite query is not present in url.
	// Composite query should be in the url if switch to edit mode is clicked or drilldown happens from dashboard.
	useEffect(() => {
		if (enableDrillDown && !compositeQueryExists && !isMounted.current) {
			redirectWithQueryBuilderData(widget.query);
		}
		isMounted.current = true;
	}, [
		widget,
		enableDrillDown,
		compositeQueryExists,
		redirectWithQueryBuilderData,
	]);

	const dashboardEditView = generateExportToDashboardLink({
		query: currentQuery,
		panelType: widget.panelTypes,
		dashboardId: selectedDashboard?.id || '',
		widgetId: widget.id,
	});

	return {
		dashboardEditView,
	};
};

export default useDrilldown;
