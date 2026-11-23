import { type ReactElement, useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Plus } from '@signozhq/icons';
import { invalidateListServiceAccounts } from 'api/generated/services/serviceaccount';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import CreateServiceAccountModal from 'components/CreateServiceAccountModal/CreateServiceAccountModal';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import type { SuggestionSource } from 'components/ListFilter/dsl/types';
import FilterZone from 'components/ListFilter/FilterZone/FilterZone';
import InvalidQueryState from 'components/ListFilter/InvalidQueryState/InvalidQueryState';
import ServiceAccountDrawer from 'components/ServiceAccountDrawer/ServiceAccountDrawer';
import ServiceAccountsTable from 'components/ServiceAccountsTable/ServiceAccountsTable';
import { useRecoverFromEmptyPage } from 'components/TanStackTableView';
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
import ServiceAccountStatusFilter from './ServiceAccountStatusFilter';
import { useServiceAccountsData } from './useServiceAccountsData';
import type { ServiceAccountRow } from './utils';

import './ServiceAccountsSettings.styles.scss';

function ServiceAccountsSettings(): JSX.Element {
	const queryClient = useQueryClient();
	const { isCloudUser } = useGetTenantLicense();
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

	useRecoverFromEmptyPage({
		page: currentPage,
		pageSize: SA_PAGE_SIZE,
		rowCount: accounts.length,
		total,
		isFetching: isFetching || isAuthZLoading,
		isDisabled: isError || Boolean(queryError) || !canListServiceAccounts,
		setPage,
	});

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

	const handleClearSearch = useCallback((): void => {
		handleQueryChange(SERVICE_ACCOUNTS_DEFAULT_QUERY);
	}, [handleQueryChange]);

	const wrapControl = useCallback(
		(node: ReactElement): ReactElement => (
			<AuthZTooltip checks={[SAListPermission]}>{node}</AuthZTooltip>
		),
		[],
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
					extraFilters={({ draft, applyDraft, setDraft }): JSX.Element => (
						<ServiceAccountStatusFilter
							draft={draft}
							disabled={controlsDisabled}
							onApplyDraft={applyDraft}
							setDraft={setDraft}
						/>
					)}
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
				/>

				<AuthZGuardContent checks={[SAListPermission]}>
					{isError && error ? (
						<ErrorInPlace
							error={toAPIError(
								error,
								'An unexpected error occurred while fetching service accounts.',
							)}
						/>
					) : queryError ? (
						<InvalidQueryState
							errorMessage={queryError}
							isCloudUser={!!isCloudUser}
							testIdPrefix="sa"
						/>
					) : (
						<ServiceAccountsTable
							data={accounts}
							total={total}
							loading={isFetching}
							onClearSearch={handleClearSearch}
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
