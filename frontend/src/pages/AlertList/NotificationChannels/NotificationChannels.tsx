import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from '@signozhq/icons';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';
import ErrorEmptyState from 'components/Alerts/ErrorEmptyState';
import NoResultsEmptyState from 'components/Alerts/NoResultsEmptyState';
import TanStackTable from 'components/TanStackTableView';
import { useCalculatedPageSize } from 'components/TanStackTableView/useCalculatedPageSize';
import { useTableParams } from 'components/TanStackTableView/useTableParams';
import TextToolTip from 'components/TextToolTip';
import { useUrlSearchState } from 'hooks/useUrlSearchState';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { withAuthZContent } from 'lib/authz/components/withAuthZ/withAuthZContent';
import {
	NotificationChannelCreatePermission,
	NotificationChannelListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import { parseAsString, useQueryState } from 'nuqs';
import { useTimezone } from 'providers/Timezone';

import ChannelActionsMenu from './components/ChannelActionsMenu/ChannelActionsMenu';
import ChannelJsonDialog from './components/ChannelJsonDialog/ChannelJsonDialog';
import DeleteChannelDialog from './components/DeleteChannelDialog/DeleteChannelDialog';
import {
	KIND_FILTER_ALL,
	KIND_FILTER_OPTIONS,
	KIND_KEY,
	SEARCH_KEY,
} from './constants';
import { useChannelDelete } from './hooks/useChannelDelete';
import { useChannelFormView } from './hooks/useChannelFormView';
import { useChannelsData } from './hooks/useChannelsData';
import styles from './NotificationChannels.module.scss';
import { getChannelColumns } from './table.config';

type Channel = AlertmanagertypesListedNotificationChannelDTO;

const QUERY_PARAMS_CONFIG = {
	orderBy: 'orderBy',
	page: 'page',
	limit: 'limit',
} as const;

const CREATE_CHECKS = [NotificationChannelCreatePermission];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function NotificationChannels(): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const formView = useChannelFormView();

	const { containerRef, calculatedPageSize } = useCalculatedPageSize({
		rowHeight: 46,
	});

	const { orderBy, page, limit, setLimit, setPage } = useTableParams(
		QUERY_PARAMS_CONFIG,
		{
			page: DEFAULT_PAGE,
			limit: DEFAULT_LIMIT,
			storageKey: 'notification-channels',
			calculatedPageSize,
			cleanupOnUnmount: true,
		},
	);

	const resetPageOnSearch = useCallback((): void => {
		setPage(1);
	}, [setPage]);

	const { searchText, debouncedSearch, handleSearchChange, clearSearch } =
		useUrlSearchState(SEARCH_KEY, { onDebouncedChange: resetPageOnSearch });

	const [kind, setKind] = useQueryState(
		KIND_KEY,
		parseAsString.withDefault(KIND_FILTER_ALL),
	);

	const handleKindChange = useCallback(
		(value: string | string[]): void => {
			const next = value as string;
			void setKind(next === KIND_FILTER_ALL ? null : next);
			setPage(1);
		},
		[setKind, setPage],
	);

	const { channels, total, isFetching, isError, refetch } = useChannelsData({
		search: debouncedSearch,
		kind,
		orderBy,
		page,
		limit,
	});

	const deletion = useChannelDelete();
	const [jsonChannel, setJsonChannel] = useState<Channel | null>(null);

	useEffect(() => {
		void logEvent('Alert Channel: Channel list page visited', {});
	}, []);

	const handleEdit = useCallback(
		(channel: Channel, options?: { newTab?: boolean }): void => {
			formView.openEdit(channel.id, options);
		},
		[formView],
	);

	const handleRowClick = useCallback(
		(channel: Channel): void => formView.openEdit(channel.id),
		[formView],
	);

	const handleRowClickNewTab = useCallback(
		(channel: Channel): void => formView.openEdit(channel.id, { newTab: true }),
		[formView],
	);

	const columns = useMemo(
		() => getChannelColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	const columnsWithActions = useMemo(
		() => [
			...columns,
			{
				id: 'actions',
				header: (): JSX.Element => (
					<span className={styles.actionsHeader}>Actions</span>
				),
				accessorKey: 'id',
				width: { fixed: '72px', ignoreLastColumnFill: true },
				enableSort: false,
				enableResize: false,
				enableRemove: false,
				enableMove: false,
				pin: 'right' as const,
				cell: ({ row }: { row: Channel }): JSX.Element => (
					<ChannelActionsMenu
						channel={row}
						onOpen={handleEdit}
						onDelete={deletion.request}
						onViewJson={setJsonChannel}
					/>
				),
			},
		],
		[columns, handleEdit, deletion.request],
	);

	const hasActiveFilters = searchText.length > 0 || kind !== KIND_FILTER_ALL;
	const isEmpty = !isFetching && channels.length === 0;

	const handleClearFilters = useCallback((): void => {
		clearSearch();
		void setKind(null);
	}, [clearSearch, setKind]);

	return (
		<div className={styles.container}>
			<header className={styles.headerBand}>
				<div className={styles.commandHeader}>
					<div className={styles.headingBlock}>
						<Typography.Title className={styles.title}>
							All notification channels
						</Typography.Title>
						<span className={styles.countPill}>{total}</span>
					</div>
					<div className={styles.grow} />
					<TextToolTip
						text="More details on how to configure notification channels"
						url="https://signoz.io/docs/setup-alerts-notification/"
						urlText="Learn More"
					/>
					<AuthZButton
						checks={CREATE_CHECKS}
						variant="solid"
						color="primary"
						className={styles.newChannelButton}
						prefix={<Plus size={14} />}
						onClick={formView.openCreate}
						testId="channels-create"
					>
						New channel
					</AuthZButton>
				</div>

				<div className={styles.filtersRow}>
					<Input
						containerClassName={styles.searchInput}
						placeholder="Search by channel name"
						value={searchText}
						onChange={handleSearchChange}
						suffix={<Search size={14} className={styles.searchIcon} />}
						testId="channels-search"
					/>
					<SelectSimple
						className={styles.kindSelect}
						items={KIND_FILTER_OPTIONS}
						value={kind}
						onChange={handleKindChange}
						withPortal={false}
						testId="channels-kind-filter"
					/>
				</div>
			</header>

			<div ref={containerRef} className={styles.tableContainer}>
				{isError ? (
					<ErrorEmptyState
						title="Failed to load notification channels"
						onRefresh={refetch}
					/>
				) : isEmpty && hasActiveFilters ? (
					<NoResultsEmptyState
						title="No matching channels"
						subtitle="No notification channels match your search. Try adjusting your search criteria."
						onClear={handleClearFilters}
						clearButtonText="Clear Search"
					/>
				) : (
					<TanStackTable<Channel>
						data={channels}
						columns={columnsWithActions}
						isLoading={isFetching}
						getRowKey={(row): string => row.id}
						getItemKey={(row): string => row.id}
						columnStorageKey="notification-channels-columns"
						enableQueryParams={QUERY_PARAMS_CONFIG}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
						pagination={{
							total,
							calculatedPageSize,
							onLimitChange: setLimit,
							showTotalCount: true,
						}}
						paginationClassname={styles.paginationContainer}
						enableAlternatingRowColors
						plainTextCellLineClamp={1}
					/>
				)}
			</div>

			{jsonChannel && (
				<ChannelJsonDialog
					channelId={jsonChannel.id}
					channelName={jsonChannel.displayName}
					onClose={(): void => setJsonChannel(null)}
				/>
			)}

			<DeleteChannelDialog
				open={!!deletion.channel}
				channelName={deletion.channel?.displayName ?? ''}
				isDeleting={deletion.isDeleting}
				onConfirm={deletion.confirm}
				onCancel={deletion.cancel}
			/>
		</div>
	);
}

export default withAuthZContent(NotificationChannels, {
	checks: [NotificationChannelListPermission],
});
