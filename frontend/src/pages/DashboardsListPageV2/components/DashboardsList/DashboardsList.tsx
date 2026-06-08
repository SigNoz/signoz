import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Typography } from '@signozhq/ui/typography';
import { AxiosError } from 'axios';
import logEvent from 'api/common/logEvent';
import {
	createDashboardV2,
	useListDashboardsV2,
} from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import { RequestDashboardBtn } from 'container/ListOfDashboard/RequestDashboardBtn';
import useComponentPermission from 'hooks/useComponentPermission';
import { toast } from '@signozhq/ui/sonner';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { toAPIError } from 'utils/errorUtils';

import {
	usePage,
	useSearch,
	useSortColumn,
	useSortOrder,
	type SortColumn,
	type SortOrder,
} from '../../hooks/useDashboardsListQueryParams';
import type { DashboardListItem } from '../../utils';
import ConfigureMetadataModal from '../ConfigureMetadataModal/ConfigureMetadataModal';
import { useDashboardsListVisibleColumnsStore } from '../ConfigureMetadataModal/useDynamicColumns';
import CreateDashboardDropdown from '../CreateDashboardDropdown/CreateDashboardDropdown';
import ImportJSONModal from '../ImportJSONModal/ImportJSONModal';
import ListHeader from '../ListHeader/ListHeader';
import EmptyState from '../states/EmptyState/EmptyState';
import ErrorState from '../states/ErrorState/ErrorState';
import LoadingState from '../states/LoadingState/LoadingState';
import NoResultsState from '../states/NoResultsState/NoResultsState';
import SearchBar from '../SearchBar/SearchBar';
import DashboardsListContent from './DashboardsListContent';

import styles from './DashboardsList.module.scss';

const PAGE_SIZE = 20;

function DashboardsList(): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { t } = useTranslation('dashboard');
	const { showErrorModal } = useErrorModal();
	const { isCloudUser } = useGetTenantLicense();

	const { user } = useAppContext();
	const [action, canCreateNewDashboard] = useComponentPermission(
		['action', 'create_new_dashboards'],
		user.role,
	);

	const [searchString, setSearchString] = useSearch();
	const [sortColumn, setSortColumn] = useSortColumn();
	const [sortOrder, setSortOrder] = useSortOrder();
	const [page, setPage] = usePage();

	const [searchInput, setSearchInput] = useState(searchString);

	// Keep the local input in sync with external searchString changes
	// (browser back/forward, deep link). User typing only mutates
	// searchInput, so this won't fight with in-flight edits.
	useEffect(() => {
		setSearchInput(searchString);
	}, [searchString]);

	const handleSubmitSearch = useCallback((): void => {
		const next = searchInput.trim();
		if (next === searchString) {
			return;
		}
		void setSearchString(next);
		void setPage(1);
	}, [searchInput, searchString, setSearchString, setPage]);

	const listParams = useMemo(
		() => ({
			query: searchString.trim() || undefined,
			sort: sortColumn,
			order: sortOrder,
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE,
		}),
		[searchString, sortColumn, sortOrder, page],
	);

	const {
		data: response,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useListDashboardsV2(listParams, { query: { keepPreviousData: true } });

	const apiError = useMemo(
		() => (error ? toAPIError(error) : undefined),
		[error],
	);
	const errorHttpStatus = apiError?.getHttpStatusCode();
	const errorMessage = apiError?.getErrorMessage();

	const dashboards = useMemo<DashboardListItem[]>(
		() => response?.data?.dashboards ?? [],
		[response],
	);
	const total = response?.data?.total ?? 0;

	const [isImportOpen, setIsImportOpen] = useState(false);
	const [isConfigureOpen, setIsConfigureOpen] = useState(false);
	const visibleColumns = useDashboardsListVisibleColumnsStore(
		(s) => s.visibleColumns,
	);

	const [creating, setCreating] = useState(false);

	const handleCreateNew = useCallback(async (): Promise<void> => {
		try {
			logEvent('Dashboard List: Create dashboard clicked', {});
			setCreating(true);
			const created = await createDashboardV2({
				schemaVersion: 'v6',
				// Backend requires `name` (immutable, server-side identifier);
				// asking it to generate one keeps the UI's "new dashboard" flow.
				generateName: true,
				tags: null,
				spec: {
					display: { name: t('new_dashboard_title', { ns: 'dashboard' }) },
				},
			});
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: created.data.id }),
			);
		} catch (e) {
			showErrorModal(e as APIError);
			toast.error((e as AxiosError).toString() || 'Failed to create dashboard');
		} finally {
			setCreating(false);
		}
	}, [safeNavigate, showErrorModal, t]);

	const handleImportToggle = useCallback((): void => {
		logEvent('Dashboard List V2: Import JSON clicked', {});
		setIsImportOpen((s) => !s);
	}, []);

	const onSortChange = useCallback(
		(column: SortColumn): void => {
			void setSortColumn(column);
			void setPage(1);
		},
		[setSortColumn, setPage],
	);

	const onOrderChange = useCallback(
		(order: SortOrder): void => {
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

	return (
		<div className={styles.container}>
			<div className={styles.viewContent}>
				<div className={styles.titleContainer}>
					<Typography.Title className={styles.title}>Dashboards</Typography.Title>
					<Typography.Text className={styles.subtitle}>
						Create and manage dashboards for your workspace.
					</Typography.Text>
					{isCloudUser && (
						<div className={styles.integrationsContainer}>
							<div className={styles.integrationsContent}>
								<RequestDashboardBtn />
							</div>
						</div>
					)}
				</div>

				{isLoading ? (
					<LoadingState />
				) : !error && dashboards.length === 0 && !searchString && page === 1 ? (
					<EmptyState
						createDropdown={
							canCreateNewDashboard ? (
								<CreateDashboardDropdown
									canCreate={!!canCreateNewDashboard}
									onCreate={handleCreateNew}
									onImportJSON={handleImportToggle}
									variant="text"
								/>
							) : null
						}
					/>
				) : (
					<>
						<div className={styles.toolbar}>
							<SearchBar
								value={searchInput}
								onChange={setSearchInput}
								onSubmit={handleSubmitSearch}
							/>
							{canCreateNewDashboard && (
								<CreateDashboardDropdown
									canCreate={!!canCreateNewDashboard}
									onCreate={handleCreateNew}
									onImportJSON={handleImportToggle}
								/>
							)}
						</div>

						{error ? (
							<ErrorState
								isCloudUser={!!isCloudUser}
								onRetry={(): void => {
									refetch();
								}}
								httpStatus={errorHttpStatus}
								errorMessage={errorMessage}
							/>
						) : dashboards.length === 0 ? (
							<NoResultsState searchString={searchInput} />
						) : (
							<>
								<ListHeader
									sortColumn={sortColumn}
									onSortChange={onSortChange}
									sortOrder={sortOrder}
									onOrderChange={onOrderChange}
									onConfigureMetadata={(): void => setIsConfigureOpen(true)}
								/>
								<DashboardsListContent
									dashboards={dashboards}
									page={page}
									pageSize={PAGE_SIZE}
									total={total}
									onPageChange={setPage}
									canAct={!!action}
									showUpdatedAt={visibleColumns.updatedAt}
									showUpdatedBy={visibleColumns.updatedBy}
									loading={creating || isFetching}
								/>
							</>
						)}
					</>
				)}

				<ImportJSONModal
					open={isImportOpen}
					onClose={(): void => setIsImportOpen(false)}
				/>

				<ConfigureMetadataModal
					open={isConfigureOpen}
					previewDashboard={dashboards[0]}
					onClose={(): void => setIsConfigureOpen(false)}
				/>
			</div>
		</div>
	);
}

export default DashboardsList;
