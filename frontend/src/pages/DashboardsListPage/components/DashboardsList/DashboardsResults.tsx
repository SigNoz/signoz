import {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { DashboardListItem } from '../../utils/helpers';
import { noResultsCopy } from '../../utils/views';
import ListHeader from '../ListHeader/ListHeader';
import ErrorState from '../states/ErrorState/ErrorState';
import LoadingState from '../states/LoadingState/LoadingState';
import NoResultsState from '../states/NoResultsState/NoResultsState';
import DashboardsListContent from './DashboardsListContent';

interface Props {
	isLoading: boolean;
	hasError: boolean;
	isCloudUser: boolean;
	onRetry: () => void;
	errorHttpStatus?: number;
	errorMessage?: string;
	dashboards: DashboardListItem[];
	activeViewId: string;
	searchValue: string;
	hasFilters: boolean;
	sortColumn: DashboardtypesListSortDTO;
	onSortChange: (column: DashboardtypesListSortDTO) => void;
	sortOrder: DashboardtypesListOrderDTO;
	onOrderChange: (order: DashboardtypesListOrderDTO) => void;
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	canEdit: boolean;
	showUpdatedAt: boolean;
	showUpdatedBy: boolean;
	loading: boolean;
}

function DashboardsResults({
	isLoading,
	hasError,
	isCloudUser,
	onRetry,
	errorHttpStatus,
	errorMessage,
	dashboards,
	activeViewId,
	searchValue,
	hasFilters,
	sortColumn,
	onSortChange,
	sortOrder,
	onOrderChange,
	page,
	pageSize,
	total,
	onPageChange,
	canEdit,
	showUpdatedAt,
	showUpdatedBy,
	loading,
}: Props): JSX.Element {
	if (isLoading) {
		return <LoadingState />;
	}
	if (hasError) {
		return (
			<ErrorState
				isCloudUser={isCloudUser}
				onRetry={onRetry}
				httpStatus={errorHttpStatus}
				errorMessage={errorMessage}
			/>
		);
	}
	if (dashboards.length === 0) {
		const copy = noResultsCopy(activeViewId, searchValue, hasFilters);
		return <NoResultsState title={copy.title} description={copy.description} />;
	}
	return (
		<>
			<ListHeader
				sortColumn={sortColumn}
				onSortChange={onSortChange}
				sortOrder={sortOrder}
				onOrderChange={onOrderChange}
			/>
			<DashboardsListContent
				dashboards={dashboards}
				page={page}
				pageSize={pageSize}
				total={total}
				onPageChange={onPageChange}
				canEdit={canEdit}
				showUpdatedAt={showUpdatedAt}
				showUpdatedBy={showUpdatedBy}
				loading={loading}
			/>
		</>
	);
}

export default DashboardsResults;
