import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react';
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
	handleResetQuery: () => void;
	showResetQuery: boolean;
}

const useDrilldown = ({
	enableDrillDown,
	widget,
	setRequestData,
	selectedDashboard,
}: DrilldownQueryProps): UseDrilldownReturn => {
	const isMounted = useRef(false);
	const { redirectWithQueryBuilderData, currentQuery } = useQueryBuilder();
	const compositeQuery = useGetCompositeQueryParam();

	useEffect(() => {
		if (enableDrillDown && !!compositeQuery) {
			setRequestData((prev) => ({
				...prev,
				query: compositeQuery,
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentQuery, compositeQuery]);

	// update composite query with widget query if composite query is not present in url.
	// Composite query should be in the url if switch to edit mode is clicked or drilldown happens from dashboard.
	useEffect(() => {
		if (enableDrillDown && !isMounted.current) {
			redirectWithQueryBuilderData(compositeQuery || widget.query);
		}
		isMounted.current = true;
	}, [widget, enableDrillDown, compositeQuery, redirectWithQueryBuilderData]);

	const dashboardEditView = generateExportToDashboardLink({
		query: currentQuery,
		panelType: widget.panelTypes,
		dashboardId: selectedDashboard?.id || '',
		widgetId: widget.id,
	});

	const showResetQuery = useMemo(
		() =>
			JSON.stringify(widget.query?.builder) !==
			JSON.stringify(compositeQuery?.builder),
		[widget.query, compositeQuery],
	);

	const handleResetQuery = useCallback((): void => {
		redirectWithQueryBuilderData(widget.query);
	}, [redirectWithQueryBuilderData, widget.query]);

	return {
		dashboardEditView,
		handleResetQuery,
		showResetQuery,
	};
};

export default useDrilldown;
