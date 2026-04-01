import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@signozhq/button';
import { Check, ChevronDown, Plus } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { useListServiceAccounts } from 'api/generated/services/serviceaccount';
import CreateServiceAccountModal from 'components/CreateServiceAccountModal/CreateServiceAccountModal';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ServiceAccountDrawer from 'components/ServiceAccountDrawer/ServiceAccountDrawer';
import ServiceAccountsTable, {
	PAGE_SIZE,
} from 'components/ServiceAccountsTable/ServiceAccountsTable';
import {
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryState,
} from 'nuqs';
import { toAPIError } from 'utils/errorUtils';

import { SA_QUERY_PARAMS } from './constants';
import {
	FilterMode,
	ServiceAccountRow,
	ServiceAccountStatus,
	toServiceAccountRow,
} from './utils';

import './ServiceAccountsSettings.styles.scss';

function ServiceAccountsSettings(): JSX.Element {
	const [currentPage, setPage] = useQueryState(
		SA_QUERY_PARAMS.PAGE,
		parseAsInteger.withDefault(1),
	);
	const [searchQuery, setSearchQuery] = useQueryState(
		SA_QUERY_PARAMS.SEARCH,
		parseAsString.withDefault(''),
	);
	const [filterMode, setFilterMode] = useQueryState(
		SA_QUERY_PARAMS.FILTER,
		parseAsStringEnum<FilterMode>(Object.values(FilterMode)).withDefault(
			FilterMode.All,
		),
	);
	const [, setSelectedAccountId] = useQueryState(SA_QUERY_PARAMS.ACCOUNT);
	const [, setIsCreateModalOpen] = useQueryState(
		SA_QUERY_PARAMS.CREATE_SA,
		parseAsBoolean.withDefault(false),
	);

	const {
		data: serviceAccountsData,
		isLoading,
		isError,
		error,
		refetch: handleCreateSuccess,
	} = useListServiceAccounts();

	const allAccounts = useMemo(
		(): ServiceAccountRow[] =>
			(serviceAccountsData?.data ?? []).map(toServiceAccountRow),
		[serviceAccountsData],
	);

	const activeCount = useMemo(
		() =>
			allAccounts.filter(
				(a) => a.status?.toUpperCase() === ServiceAccountStatus.Active,
			).length,
		[allAccounts],
	);

	const deletedCount = useMemo(
		() =>
			allAccounts.filter(
				(a) => a.status?.toUpperCase() === ServiceAccountStatus.Deleted,
			).length,
		[allAccounts],
	);

	const filteredAccounts = useMemo((): ServiceAccountRow[] => {
		let result = allAccounts;

		if (filterMode === FilterMode.Active) {
			result = result.filter(
				(a) => a.status?.toUpperCase() === ServiceAccountStatus.Active,
			);
		} else if (filterMode === FilterMode.Deleted) {
			result = result.filter(
				(a) => a.status?.toUpperCase() === ServiceAccountStatus.Deleted,
			);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			result = result.filter(
				(a) =>
					a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q),
			);
		}

		return result;
	}, [allAccounts, filterMode, searchQuery]);

	useEffect(() => {
		if (filteredAccounts.length === 0) {
			return;
		}

		const maxPage = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
		if (currentPage > maxPage) {
			setPage(maxPage);
		} else if (currentPage < 1) {
			setPage(1);
		}
	}, [filteredAccounts.length, currentPage, setPage]);

	const totalCount = allAccounts.length;

	const filterMenuItems: MenuProps['items'] = [
		{
			key: FilterMode.All,
			label: (
				<div className="sa-settings-filter-option">
					<span>All accounts ⎯ {totalCount}</span>
					{filterMode === FilterMode.All && <Check size={14} />}
				</div>
			),
			onClick: (): void => {
				setFilterMode(FilterMode.All);
				setPage(1);
			},
		},
		{
			key: FilterMode.Active,
			label: (
				<div className="sa-settings-filter-option">
					<span>Active ⎯ {activeCount}</span>
					{filterMode === FilterMode.Active && <Check size={14} />}
				</div>
			),
			onClick: (): void => {
				setFilterMode(FilterMode.Active);
				setPage(1);
			},
		},
		{
			key: FilterMode.Deleted,
			label: (
				<div className="sa-settings-filter-option">
					<span>Deleted ⎯ {deletedCount}</span>
					{filterMode === FilterMode.Deleted && <Check size={14} />}
				</div>
			),
			onClick: (): void => {
				setFilterMode(FilterMode.Deleted);
				setPage(1);
			},
		},
	];

	function getFilterLabel(): string {
		switch (filterMode) {
			case FilterMode.Active:
				return `Active ⎯ ${activeCount}`;
			case FilterMode.Deleted:
				return `Deleted ⎯ ${deletedCount}`;
			default:
				return `All accounts ⎯ ${totalCount}`;
		}
	}
	const filterLabel = getFilterLabel();

	const handleRowClick = useCallback(
		(row: ServiceAccountRow): void => {
			setSelectedAccountId(row.id);
		},
		[setSelectedAccountId],
	);

	const handleDrawerSuccess = useCallback(
		(options?: { closeDrawer?: boolean }): void => {
			if (options?.closeDrawer) {
				setSelectedAccountId(null);
			}
			handleCreateSuccess();
		},
		[handleCreateSuccess, setSelectedAccountId],
	);

	return (
		<>
			<div className="sa-settings">
				<div className="sa-settings__header">
					<h1 className="sa-settings__title">Service Accounts</h1>
					<p className="sa-settings__subtitle">
						Overview of service accounts added to this workspace.{' '}
						{/* Todo: to add doc links */}
						{/* <a
							href="https://signoz.io/docs/service-accounts"
							target="_blank"
							rel="noopener noreferrer"
							className="sa-settings__learn-more"
						>
							Learn more
						</a> */}
					</p>
				</div>

				<div className="sa-settings__controls">
					<Dropdown
						menu={{ items: filterMenuItems }}
						trigger={['click']}
						overlayClassName="sa-settings-filter-dropdown"
					>
						<Button
							variant="solid"
							size="sm"
							color="secondary"
							className="sa-settings-filter-trigger"
						>
							<span>{filterLabel}</span>
							<ChevronDown size={12} className="sa-settings-filter-trigger__chevron" />
						</Button>
					</Dropdown>

					<div className="sa-settings__search">
						<Input
							type="search"
							name="service-accounts-search"
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e): void => {
								setSearchQuery(e.target.value);
								setPage(1);
							}}
							className="sa-settings-search-input"
							color="secondary"
						/>
					</div>

					<Button
						variant="solid"
						size="sm"
						color="primary"
						onClick={async (): Promise<void> => {
							await setIsCreateModalOpen(true);
						}}
					>
						<Plus size={12} />
						New Service Account
					</Button>
				</div>
			</div>

			{isError ? (
				<ErrorInPlace
					error={toAPIError(
						error,
						'An unexpected error occurred while fetching service accounts.',
					)}
				/>
			) : (
				<ServiceAccountsTable
					data={filteredAccounts}
					loading={isLoading}
					onRowClick={handleRowClick}
				/>
			)}

			<CreateServiceAccountModal />

			<ServiceAccountDrawer onSuccess={handleDrawerSuccess} />
		</>
	);
}

export default ServiceAccountsSettings;
