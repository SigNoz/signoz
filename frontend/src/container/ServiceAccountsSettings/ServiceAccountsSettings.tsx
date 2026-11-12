import { type ReactElement, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Check, ChevronDown, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { invalidateListServiceAccounts } from 'api/generated/services/serviceaccount';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import CreateServiceAccountModal from 'components/CreateServiceAccountModal/CreateServiceAccountModal';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import type { SuggestionSource } from 'components/ListFilter/dsl/types';
import FilterZone from 'components/ListFilter/FilterZone/FilterZone';
import ServiceAccountDrawer from 'components/ServiceAccountDrawer/ServiceAccountDrawer';
import ServiceAccountsTable from 'components/ServiceAccountsTable/ServiceAccountsTable';
import {
	SACreatePermission,
	SAListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/service-account.permissions';
import {
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	useQueryState,
} from 'nuqs';
import { toAPIError } from 'utils/errorUtils';

import { SA_PAGE_SIZE, SA_QUERY_PARAMS } from './constants';
import {
	SERVICE_ACCOUNTS_DEFAULT_QUERY,
	SERVICE_ACCOUNTS_DSL_GRAMMAR,
} from './list.config';
import { useServiceAccountsData } from './useServiceAccountsData';
import {
	FilterMode,
	filterModeFromQuery,
	ServiceAccountRow,
	withFilterMode,
} from './utils';

import './ServiceAccountsSettings.styles.scss';

const FILTER_LABELS: Record<FilterMode, string> = {
	[FilterMode.All]: 'All accounts',
	[FilterMode.Active]: 'Active',
	[FilterMode.Deleted]: 'Deleted',
};

function ServiceAccountsSettings(): JSX.Element {
	const queryClient = useQueryClient();
	const { permissions: authzPermissions, isLoading: isAuthZLoading } = useAuthZ([
		SAListPermission,
	]);
	const canListServiceAccounts =
		authzPermissions?.[SAListPermission]?.isGranted ?? false;
	const [, setSelectedAccountId] = useQueryState(SA_QUERY_PARAMS.ACCOUNT);
	const [currentPage, setPage] = useQueryState(
		SA_QUERY_PARAMS.PAGE,
		parseAsInteger.withDefault(1),
	);
	const [searchQuery, setSearchQuery] = useQueryState(
		SA_QUERY_PARAMS.SEARCH,
		parseAsString
			.withDefault(SERVICE_ACCOUNTS_DEFAULT_QUERY)
			.withOptions({ history: 'push' }),
	);
	const filterMode = filterModeFromQuery(searchQuery);
	const [, setIsCreateModalOpen] = useQueryState(
		SA_QUERY_PARAMS.CREATE_SA,
		parseAsBoolean.withDefault(false),
	);

	const {
		accounts,
		total,
		reservedKeywords,
		isFetching,
		isError,
		error,
		queryError,
	} = useServiceAccountsData({
		query: searchQuery,
		page: currentPage,
		enabled: canListServiceAccounts,
	});

	const controlsDisabled = isAuthZLoading || !canListServiceAccounts;

	useEffect(() => {
		if (total === 0) {
			return;
		}

		const maxPage = Math.max(1, Math.ceil(total / SA_PAGE_SIZE));
		if (currentPage > maxPage) {
			void setPage(maxPage);
		} else if (currentPage < 1) {
			void setPage(1);
		}
	}, [total, currentPage, setPage]);

	const source = useMemo<SuggestionSource>(
		() => ({
			reservedKeys: reservedKeywords,
			dynamicKeys: [],
			valuesByKey: {},
			creatorEmails: [],
		}),
		[reservedKeywords],
	);

	const handleQueryChange = useCallback(
		(value: string): void => {
			void setSearchQuery(value);
			void setPage(1);
		},
		[setSearchQuery, setPage],
	);

	const wrapControl = useCallback(
		(node: ReactElement): ReactElement => (
			<AuthZTooltip checks={[SAListPermission]}>{node}</AuthZTooltip>
		),
		[],
	);

	const filterMenuItems: DropdownItemType[] = Object.values(FilterMode).map(
		(mode) => ({
			type: 'item',
			value: mode,
			label: (
				<div className="sa-settings-filter-option">
					<span>{FILTER_LABELS[mode]}</span>
					{filterMode === mode && <Check size={14} />}
				</div>
			),
			onClick: (): void => handleQueryChange(withFilterMode(searchQuery, mode)),
		}),
	);

	const handleRowClick = useCallback(
		(row: ServiceAccountRow): void => {
			void setSelectedAccountId(row.id);
		},
		[setSelectedAccountId],
	);

	const handleDrawerSuccess = useCallback(
		(options?: { closeDrawer?: boolean }): void => {
			if (options?.closeDrawer) {
				void setSelectedAccountId(null);
			}
			void invalidateListServiceAccounts(queryClient);
		},
		[queryClient, setSelectedAccountId],
	);

	return (
		<div className="sa-settings-page">
			<div className="sa-settings">
				<div className="sa-settings__header">
					<h1 className="sa-settings__title">Service Accounts</h1>
					<p className="sa-settings__subtitle">
						Overview of service accounts added to this workspace.{' '}
						<a
							href="https://signoz.io/docs/manage/administrator-guide/iam/service-accounts"
							target="_blank"
							rel="noopener noreferrer"
							className="sa-settings__learn-more"
						>
							Learn more
						</a>
					</p>
				</div>
			</div>

			<div className="sa-settings__list-section">
				<FilterZone
					query={searchQuery}
					grammar={SERVICE_ACCOUNTS_DSL_GRAMMAR}
					testIdPrefix="sa"
					placeholder="DSL Filter — e.g. name CONTAINS 'ci' AND status = 'active'"
					source={source}
					disabled={controlsDisabled}
					wrapControl={wrapControl}
					onQueryChange={handleQueryChange}
					error={queryError ?? undefined}
					rightSlot={
						<AuthZButton
							size="md"
							checks={[SACreatePermission]}
							variant="solid"
							color="primary"
							onClick={async (): Promise<void> => {
								await setIsCreateModalOpen(true);
							}}
							prefix={<Plus size={12} />}
							testId="new-sa-btn"
						>
							New Service Account
						</AuthZButton>
					}
					extraFilters={
						<Dropdown items={filterMenuItems} nativeButton align="end" side="bottom">
							<Button
								size="md"
								variant="solid"
								color="secondary"
								loading={isAuthZLoading}
								disabled={!canListServiceAccounts}
								disabledTooltip={undefined}
								testId="sa-filter-trigger"
								suffix={
									<ChevronDown
										size={12}
										className="sa-settings-filter-trigger__chevron"
									/>
								}
							>
								<span>{FILTER_LABELS[filterMode]}</span>
							</Button>
						</Dropdown>
					}
				/>

				<AuthZGuardContent checks={[SAListPermission]}>
					{isError && error ? (
						<ErrorInPlace
							error={toAPIError(
								error,
								'An unexpected error occurred while fetching service accounts.',
							)}
						/>
					) : (
						<ServiceAccountsTable
							data={accounts}
							total={total}
							loading={isFetching}
							onRowClick={handleRowClick}
						/>
					)}
				</AuthZGuardContent>
			</div>

			<CreateServiceAccountModal />

			<ServiceAccountDrawer onSuccess={handleDrawerSuccess} />
		</div>
	);
}

export default ServiceAccountsSettings;
