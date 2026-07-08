import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logEvent from 'api/common/logEvent';
import { useListDashboardsForUserV2 } from 'api/generated/services/dashboard';
import {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';
import useComponentPermission from 'hooks/useComponentPermission';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useAppContext } from 'providers/App/App';
import { toAPIError } from 'utils/errorUtils';

import { useAccumulatedTags } from '../../hooks/useAccumulatedTags';
import { useActiveView } from '../../hooks/useActiveView';
import { useCreatorOptions } from '../../hooks/useCreatorOptions';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import {
	usePage,
	useSortColumn,
	useSortOrder,
} from '../../hooks/useDashboardsListQueryParams';
import { useDashboardViewsStore } from '../../store/useDashboardViewsStore';
import { useDashboardsListVisibleColumnsStore } from '../../store/useVisibleColumnsStore';
import { BuiltinViewId } from '../../types';
import type { SelectedTag, UpdatedWindow } from '../../types';
import type { DashboardListItem } from '../../utils/helpers';
import { applyClientView } from '../../utils/views';
import FilterZone from '../FilterZone/FilterZone';
import NewDashboardModal from '../NewDashboardModal/NewDashboardModal';
import StatusBar from '../StatusBar/StatusBar';
import ViewsRail from '../ViewsRail/ViewsRail';
import CommandHeader from './CommandHeader';
import DashboardsResults from './DashboardsResults';
import WorkspaceEmptyState from './WorkspaceEmptyState';

import styles from './DashboardsList.module.scss';

const PAGE_SIZE = 20;
// Favorites / recently-viewed are filtered client-side (no server id filter), so
// we pull a single large page and constrain it in-memory.
const CLIENT_VIEW_LIMIT = 200;

function DashboardsList(): JSX.Element {
	const { isCloudUser } = useGetTenantLicense();

	const { user } = useAppContext();
	const [editDashboard, canCreateNewDashboard] = useComponentPermission(
		['edit_dashboard', 'create_new_dashboards'],
		user.role,
	);
	const canEdit = !!editDashboard;

	const {
		filters,
		query,
		isEmpty: filtersEmpty,
		setSearch,
		setCreatedBy,
		setUpdated,
		setTags,
		applyFilters,
		clearAll,
	} = useDashboardFilters();
	const [sortColumn, setSortColumn] = useSortColumn();
	const [sortOrder, setSortOrder] = useSortOrder();
	const [page, setPage] = usePage();

	const {
		activeViewId,
		builtinViews,
		customViews,
		customViewsLoading,
		isCustomActive,
		isModified,
		clientView,
		selectView,
		saveView,
		saveActiveView,
		resetView,
		removeView,
		renameView,
	} = useActiveView({
		filters,
		applyFilters,
		userEmail: user.email,
		sortColumn,
		sortOrder,
		setSortColumn,
		setSortOrder,
	});

	const railCollapsed = useDashboardViewsStore((s) => s.railCollapsed);
	const setRailCollapsed = useDashboardViewsStore((s) => s.setRailCollapsed);
	const recent = useDashboardViewsStore((s) => s.recent);

	// Any filter change resets to the first page so the user isn't stranded on a
	// now-out-of-range offset.
	const handleSearchChange = useCallback(
		(value: string): void => {
			setSearch(value);
			void setPage(1);
		},
		[setSearch, setPage],
	);
	const handleCreatedByChange = useCallback(
		(emails: string[]): void => {
			setCreatedBy(emails);
			void setPage(1);
		},
		[setCreatedBy, setPage],
	);
	const handleUpdatedChange = useCallback(
		(window: UpdatedWindow): void => {
			setUpdated(window);
			void setPage(1);
		},
		[setUpdated, setPage],
	);
	const handleTagsChange = useCallback(
		(tags: SelectedTag[]): void => {
			setTags(tags);
			void setPage(1);
		},
		[setTags, setPage],
	);
	const handleClearAll = useCallback((): void => {
		clearAll();
		void setPage(1);
	}, [clearAll, setPage]);

	// View actions that change the result set reset pagination too.
	const handleSelectView = useCallback(
		(id: string): void => {
			selectView(id);
			void setPage(1);
		},
		[selectView, setPage],
	);
	const handleResetView = useCallback((): void => {
		resetView();
		void setPage(1);
	}, [resetView, setPage]);
	const handleRemoveView = useCallback(
		(id: string): void => {
			removeView(id);
			void setPage(1);
		},
		[removeView, setPage],
	);
	const toggleRail = useCallback((): void => {
		setRailCollapsed(!railCollapsed);
	}, [setRailCollapsed, railCollapsed]);

	const listParams = useMemo(
		() => ({
			query: query || undefined,
			sort: sortColumn,
			order: sortOrder,
			limit: clientView ? CLIENT_VIEW_LIMIT : PAGE_SIZE,
			offset: clientView ? 0 : (page - 1) * PAGE_SIZE,
		}),
		[query, sortColumn, sortOrder, page, clientView],
	);

	const {
		data: response,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useListDashboardsForUserV2(listParams, {
		query: { keepPreviousData: true },
	});

	const apiError = useMemo(
		() => (error ? toAPIError(error) : undefined),
		[error],
	);
	const errorHttpStatus = apiError?.getHttpStatusCode();
	const errorMessage = apiError?.getErrorMessage();

	const rawDashboards = useMemo<DashboardListItem[]>(
		() => response?.data?.dashboards ?? [],
		[response],
	);

	// Favorites / recently-viewed constrain the fetched rows by a client-side id
	// set; all other views are already constrained server-side.
	const dashboards = useMemo<DashboardListItem[]>(
		() =>
			clientView
				? applyClientView(rawDashboards, activeViewId, recent)
				: rawDashboards,
		[clientView, rawDashboards, activeViewId, recent],
	);
	const total = clientView ? dashboards.length : (response?.data?.total ?? 0);

	// Authors present on the loaded page — a fallback for the creator filter until
	// the org-wide user list resolves.
	const pageAuthorEmails = useMemo<string[]>(
		() =>
			rawDashboards
				.map((d) => d.createdBy)
				.filter((email): email is string => !!email),
		[rawDashboards],
	);
	const creatorOptions = useCreatorOptions({
		currentUserEmail: user.email,
		fallbackEmails: pageAuthorEmails,
	});

	// All key:value tags the API reports for the org's dashboards, powering the
	// Tags filter chip and DSL key suggestions. Accumulated across refetches so
	// previously-seen tags stay selectable even when a filtered page omits them.
	const responseTags = useMemo<SelectedTag[]>(
		() =>
			(response?.data?.tags ?? []).map((t) => ({ key: t.key, value: t.value })),
		[response],
	);
	const availableTags = useAccumulatedTags(responseTags);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const visibleColumns = useDashboardsListVisibleColumnsStore(
		(s) => s.visibleColumns,
	);

	const openCreate = useCallback((): void => {
		logEvent('Dashboard List: New dashboard clicked', {});
		setIsCreateOpen(true);
	}, []);

	const onSortChange = useCallback(
		(column: DashboardtypesListSortDTO): void => {
			void setSortColumn(column);
			void setPage(1);
		},
		[setSortColumn, setPage],
	);

	const onOrderChange = useCallback(
		(order: DashboardtypesListOrderDTO): void => {
			void setSortOrder(order);
			void setPage(1);
		},
		[setSortOrder, setPage],
	);

	const visitLoggedRef = useRef(false);
	useEffect(() => {
		if (!visitLoggedRef.current && !isLoading && response !== undefined) {
			logEvent('Dashboard List V2: Page visited', { number: dashboards.length });
			visitLoggedRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoading]);

	const activeLabel =
		customViews.find((v) => v.id === activeViewId)?.name ??
		builtinViews.find((v) => v.id === activeViewId)?.label ??
		'Dashboards';

	// The workspace-empty CTA ("create your first dashboard") belongs only to the
	// unfiltered All view; every other view's zero result is a no-results state.
	const showWorkspaceEmpty =
		!error &&
		dashboards.length === 0 &&
		activeViewId === BuiltinViewId.All &&
		filtersEmpty &&
		page === 1;

	const isWorkspaceEmpty = showWorkspaceEmpty && !isLoading;

	return (
		<div className={styles.layout}>
			<ViewsRail
				activeViewId={activeViewId}
				builtinViews={builtinViews}
				customViews={customViews}
				customViewsLoading={customViewsLoading}
				isCustomActive={isCustomActive}
				isModified={isModified}
				collapsed={railCollapsed}
				onSelect={handleSelectView}
				onSave={saveView}
				onSaveChanges={saveActiveView}
				onReset={handleResetView}
				onDelete={handleRemoveView}
				onRename={renameView}
				canEdit={canEdit}
			/>
			<div className={styles.main}>
				<div className={styles.mainScroll}>
					{isWorkspaceEmpty ? (
						<WorkspaceEmptyState
							canCreate={canCreateNewDashboard}
							onCreate={openCreate}
						/>
					) : (
						<>
							<div className={styles.headerZone}>
								<CommandHeader
									label={activeLabel}
									count={total}
									isModified={isModified}
									canCreate={canCreateNewDashboard}
									onCreate={openCreate}
								/>
								<FilterZone
									search={filters.search}
									createdBy={filters.createdBy}
									updated={filters.updated}
									tags={filters.tags}
									availableTags={availableTags}
									creatorOptions={creatorOptions}
									isEmpty={filtersEmpty}
									onSearchChange={handleSearchChange}
									onCreatedByChange={handleCreatedByChange}
									onUpdatedChange={handleUpdatedChange}
									onTagsChange={handleTagsChange}
									onClearAll={handleClearAll}
								/>
							</div>
							<div className={styles.viewContent}>
								<DashboardsResults
									isLoading={isLoading}
									hasError={!!error}
									isCloudUser={!!isCloudUser}
									onRetry={(): void => {
										refetch();
									}}
									errorHttpStatus={errorHttpStatus}
									errorMessage={errorMessage}
									dashboards={dashboards}
									activeViewId={activeViewId}
									searchValue={filters.search}
									hasFilters={!filtersEmpty}
									sortColumn={sortColumn}
									onSortChange={onSortChange}
									sortOrder={sortOrder}
									onOrderChange={onOrderChange}
									page={page}
									pageSize={clientView ? CLIENT_VIEW_LIMIT : PAGE_SIZE}
									total={total}
									onPageChange={setPage}
									canEdit={canEdit}
									showUpdatedAt={visibleColumns.updatedAt}
									showUpdatedBy={visibleColumns.updatedBy}
									loading={isFetching}
								/>
							</div>
						</>
					)}
				</div>
				<StatusBar
					collapsed={railCollapsed}
					onToggleCollapse={toggleRail}
					count={dashboards.length}
					total={total}
				/>
			</div>

			<NewDashboardModal
				open={isCreateOpen}
				onClose={(): void => setIsCreateOpen(false)}
			/>
		</div>
	);
}

export default DashboardsList;
