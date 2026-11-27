import { useCallback, useMemo } from 'react';
import ErrorEmptyState from 'components/Alerts/ErrorEmptyState';
import NoResultsEmptyState from 'components/Alerts/NoResultsEmptyState';
import InvalidQueryState from 'components/ListFilter/InvalidQueryState/InvalidQueryState';
import ListCommandHeader from 'components/ListViews/ListCommandHeader/ListCommandHeader';
import ListHeaderZone from 'components/ListViews/ListHeaderZone/ListHeaderZone';
import ListStatusBar from 'components/ListViews/ListStatusBar/ListStatusBar';
import ViewsRail from 'components/ListViews/ViewsRail/ViewsRail';
import TanStackTable from 'components/TanStackTableView';
import { useCalculatedPageSize } from 'components/TanStackTableView/useCalculatedPageSize';
import { useTableParams } from 'components/TanStackTableView/useTableParams';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import { RuleListPermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';

import { AlertsEmptyState } from './AlertsEmptyState/AlertsEmptyState';
import { ActionsMenu } from './components';
import AlertRulesFilterZone from './components/AlertRulesFilterZone';
import AlertRulesHeaderActions from './components/AlertRulesHeaderActions';
import styles from './ListAlertRules.module.scss';
import { getAlertRuleColumns } from './table.config';
import type { AlertRule } from './types';
import { useAlertRulesStripInfo } from './useAlertRulesStripInfo';
import { useAlertRulesData } from './useAlertRulesData';
import { useAlertRulesFilterSource } from './useAlertRulesFilterSource';
import { useAlertRulesHandlers } from './useAlertRulesHandlers';
import { useAlertRulesListFilter } from './useAlertRulesListFilter';
import { useAlertRuleViews } from './useAlertRuleViews';
import { useAlertRuleViewsStore } from './useAlertRuleViewsStore';
import {
	DEFAULT_RULE_VIEW,
	findRuleBuiltinView,
	RULE_BUILTIN_VIEWS,
} from './list.config';
import { useRuleViewCtx } from './useRuleViewCtx';
import { ruleListEmptyState } from './utils';

const QUERY_PARAMS_CONFIG = {
	orderBy: 'orderBy',
	page: 'page',
	limit: 'limit',
} as const;

// Client-filtered views (Recently viewed) narrow one page of the API's max size.
const CLIENT_VIEW_LIMIT = 200;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const RULE_LIST_CHECKS = [RuleListPermission];

function ListAlertRules(): JSX.Element {
	const { user } = useAppContext();
	const { isCloudUser } = useGetTenantLicense();
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const { containerRef, calculatedPageSize } = useCalculatedPageSize({
		rowHeight: 46,
	});

	const { orderBy, page, limit, setLimit, setPage, setOrderBy } = useTableParams(
		QUERY_PARAMS_CONFIG,
		{
			page: DEFAULT_PAGE,
			limit: DEFAULT_LIMIT,
			storageKey: 'alert-rules',
			calculatedPageSize,
			cleanupOnUnmount: true,
		},
	);

	const { filter, applyFilter, submitQuery, changeStates, changeSort } =
		useAlertRulesListFilter({ orderBy, setOrderBy, setPage });

	const ruleViews = useAlertRuleViews({ filter, applyFilter });

	const railCollapsed = useAlertRuleViewsStore((s) => s.railCollapsed);
	const setRailCollapsed = useAlertRuleViewsStore((s) => s.setRailCollapsed);
	const toggleRail = useCallback((): void => {
		setRailCollapsed(!railCollapsed);
	}, [setRailCollapsed, railCollapsed]);

	const viewCtx = useRuleViewCtx();
	const clientFilter = findRuleBuiltinView(ruleViews.activeViewId)?.clientFilter;
	const clientView = !!clientFilter;

	const listParams = useMemo(
		() => ({
			query: filter.query || undefined,
			states: filter.states.length ? filter.states : undefined,
			sort: filter.sort,
			order: filter.order,
			limit: clientView ? CLIENT_VIEW_LIMIT : limit,
			offset: clientView ? 0 : (page - 1) * limit,
		}),
		[filter, limit, page, clientView],
	);

	const {
		rules: fetchedRules,
		total: fetchedTotal,
		labels,
		reservedKeywords,
		isFetching,
		isError,
		queryError,
		refetch,
	} = useAlertRulesData(listParams);

	const clientRules = useMemo(
		() => (clientFilter ? clientFilter(fetchedRules, viewCtx) : null),
		[clientFilter, fetchedRules, viewCtx],
	);
	const rules = useMemo(
		() =>
			clientRules
				? clientRules.slice((page - 1) * limit, page * limit)
				: fetchedRules,
		[clientRules, fetchedRules, page, limit],
	);
	const total = clientRules ? clientRules.length : fetchedTotal;

	const { creatorOptions, source } = useAlertRulesFilterSource({
		rules,
		labels,
		reservedKeywords,
		userEmail: user.email,
	});

	const { handleEdit, handleNewAlert, handleRowClick, handleRowClickNewTab } =
		useAlertRulesHandlers(total);

	const { selectView } = ruleViews;
	const handleClearFilters = useCallback((): void => {
		selectView(DEFAULT_RULE_VIEW);
	}, [selectView]);

	const columns = useMemo(
		() => getAlertRuleColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	useAlertRulesStripInfo({
		shownCount: rules.length,
		totalCount: total,
	});

	const columnsWithActions = useMemo(() => {
		return [
			...columns,
			{
				id: 'actions',
				header: (): JSX.Element => (
					<span style={{ textAlign: 'right', display: 'block' }}>Actions</span>
				),
				accessorKey: 'id',
				width: { fixed: '80px', ignoreLastColumnFill: true },
				enableSort: false,
				enableRemove: false,
				enableMove: false,
				pin: 'right' as const,
				cell: ({ row }: { row: AlertRule }): JSX.Element => (
					<div className={styles.actionsColumn}>
						<ActionsMenu rule={row} onEdit={handleEdit} />
					</div>
				),
			},
		];
	}, [columns, handleEdit]);

	const hasActiveFilters = filter.query.length > 0 || filter.states.length > 0;
	const { isEmptyDueToFilters, isEmptyNoRules, noResults, onClear } =
		ruleListEmptyState({
			isFetching,
			isError,
			queryError,
			hasActiveFilters,
			total,
			viewEmptyState: findRuleBuiltinView(ruleViews.activeViewId)?.emptyState,
			onClear: handleClearFilters,
		});

	const activeLabel =
		ruleViews.activeView?.name ??
		RULE_BUILTIN_VIEWS.find((v) => v.id === ruleViews.activeViewId)?.label ??
		'Alert rules';

	const listContent = isError ? (
		<ErrorEmptyState title="Failed to load alert rules" onRefresh={refetch} />
	) : isEmptyDueToFilters && queryError ? (
		<InvalidQueryState
			errorMessage={queryError}
			isCloudUser={!!isCloudUser}
			testIdPrefix="alert-rules"
		/>
	) : isEmptyDueToFilters ? (
		<NoResultsEmptyState
			title={noResults.title}
			subtitle={noResults.description}
			onClear={onClear}
			clearButtonText="Clear Search"
		/>
	) : isEmptyNoRules ? (
		<AlertsEmptyState onRefresh={refetch} />
	) : (
		<TanStackTable<AlertRule>
			data={rules}
			columns={columnsWithActions}
			isLoading={isFetching}
			getRowKey={(row): string => row.id}
			getRowTestId={(row): string => `alert-row-${row.id}`}
			getItemKey={(row): string => row.id}
			columnStorageKey="alert-rules-columns"
			enableQueryParams={QUERY_PARAMS_CONFIG}
			onSort={changeSort}
			onRowClick={handleRowClick}
			onRowClickNewTab={handleRowClickNewTab}
			pagination={{
				total,
				calculatedPageSize,
				onLimitChange: setLimit,
				showTotalCount: true,
			}}
			paginationClassname={styles.paginationContainer}
			plainTextCellLineClamp={2}
		/>
	);

	return (
		<div className={styles.layout}>
			<ViewsRail
				activeViewId={ruleViews.activeViewId}
				builtinViews={RULE_BUILTIN_VIEWS}
				customViews={ruleViews.customViews}
				customViewsLoading={ruleViews.customViewsLoading}
				isCustomActive={ruleViews.isCustomActive}
				isModified={ruleViews.isModified}
				collapsed={railCollapsed}
				onSelect={ruleViews.selectView}
				onSave={ruleViews.saveView}
				onSaveChanges={ruleViews.saveActiveView}
				onReset={ruleViews.resetView}
				onDelete={ruleViews.removeView}
				onRename={ruleViews.renameView}
				testIdPrefix="alert-rules"
				saveTestIdPrefix="save-alert-rule-view"
				renameTestIdPrefix="rename-alert-rule-view"
				viewNamePlaceholder="e.g. Prod alerts"
				deleteDescription="Views are shared across your organization, so this removes it for everyone. Alert rules are not affected."
			/>
			<div className={styles.main}>
				<ListHeaderZone testId="alert-rules-header-zone">
					<ListCommandHeader
						label={activeLabel}
						count={total}
						isCountLoading={isFetching}
						isModified={ruleViews.isModified}
						testIdPrefix="alert-rules"
						action={
							<AlertRulesHeaderActions
								columns={columns}
								showNewAlert={!isEmptyNoRules}
								onNewAlert={handleNewAlert}
							/>
						}
					/>
					<AlertRulesFilterZone
						query={filter.query}
						states={filter.states}
						creatorOptions={creatorOptions}
						source={source}
						onQueryChange={submitQuery}
						onStatesChange={changeStates}
					/>
				</ListHeaderZone>

				<div ref={containerRef} className={styles.tableContainer}>
					<AuthZGuardContent
						checks={RULE_LIST_CHECKS}
						fallback={({ deniedPermissions }): JSX.Element => (
							<PermissionDeniedCallout
								deniedPermissions={deniedPermissions}
								className={styles.guardInset}
							/>
						)}
						// The list renders while the check is pending, so the table mounts
						// with the page and its URL state settles as before.
						fallbackOnLoading={listContent}
					>
						{listContent}
					</AuthZGuardContent>
				</div>
				<ListStatusBar
					collapsed={railCollapsed}
					onToggleCollapse={toggleRail}
					count={rules.length}
					total={total}
					noun="alert rules"
					testId="alert-rules-rail-toggle"
				/>
			</div>
		</div>
	);
}

export default ListAlertRules;
