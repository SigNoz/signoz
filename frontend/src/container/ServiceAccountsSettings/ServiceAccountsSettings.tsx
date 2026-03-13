import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { Check, ChevronDown, Plus } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { useListServiceAccounts } from 'api/generated/services/serviceaccount';
import CreateServiceAccountModal from 'components/CreateServiceAccountModal/CreateServiceAccountModal';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ServiceAccountDrawer from 'components/ServiceAccountDrawer/ServiceAccountDrawer';
import ServiceAccountsTable from 'components/ServiceAccountsTable/ServiceAccountsTable';
import useUrlQuery from 'hooks/useUrlQuery';
import { toISOString } from 'utils/app';
import { toAPIError } from 'utils/errorUtils';

import { FilterMode, ServiceAccountRow, ServiceAccountStatus } from './utils';

import './ServiceAccountsSettings.styles.scss';

const PAGE_SIZE = 20;

function ServiceAccountsSettings(): JSX.Element {
	const history = useHistory();
	const urlQuery = useUrlQuery();

	const pageParam = parseInt(urlQuery.get('page') ?? '1', 10);
	const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

	const [searchQuery, setSearchQuery] = useState('');
	const [filterMode, setFilterMode] = useState<FilterMode>(FilterMode.All);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [
		selectedAccount,
		setSelectedAccount,
	] = useState<ServiceAccountRow | null>(null);

	const {
		data: serviceAccountsData,
		isLoading,
		isError,
		error,
		refetch,
	} = useListServiceAccounts();

	const allAccounts = useMemo(
		(): ServiceAccountRow[] =>
			(serviceAccountsData?.data ?? []).map((sa) => ({
				id: sa.id,
				name: sa.name,
				email: sa.email,
				roles: sa.roles,
				status: sa.status,
				createdAt: toISOString(sa.createdAt),
				updatedAt: toISOString(sa.updatedAt),
			})),
		[serviceAccountsData],
	);

	const activeCount = useMemo(
		() =>
			allAccounts.filter(
				(a) => a.status?.toUpperCase() === ServiceAccountStatus.Active,
			).length,
		[allAccounts],
	);

	const disabledCount = useMemo(
		() =>
			allAccounts.filter(
				(a) => a.status?.toUpperCase() !== ServiceAccountStatus.Active,
			).length,
		[allAccounts],
	);

	const filteredAccounts = useMemo((): ServiceAccountRow[] => {
		let result = allAccounts;

		if (filterMode === FilterMode.Active) {
			result = result.filter(
				(a) => a.status?.toUpperCase() === ServiceAccountStatus.Active,
			);
		} else if (filterMode === FilterMode.Disabled) {
			result = result.filter(
				(a) => a.status?.toUpperCase() !== ServiceAccountStatus.Active,
			);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(a) =>
					a.name?.toLowerCase().includes(q) ||
					a.email?.toLowerCase().includes(q) ||
					a.roles?.some((role: string) => role.toLowerCase().includes(q)),
			);
		}

		return result;
	}, [allAccounts, filterMode, searchQuery]);

	const paginatedAccounts = useMemo((): ServiceAccountRow[] => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filteredAccounts.slice(start, start + PAGE_SIZE);
	}, [filteredAccounts, currentPage]);

	const setPage = useCallback(
		(page: number): void => {
			urlQuery.set('page', String(page));
			history.replace({ search: urlQuery.toString() });
		},
		[history, urlQuery],
	);

	useEffect(() => {
		if (filteredAccounts.length === 0) {
			return;
		}

		const maxPage = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
		if (currentPage > maxPage || currentPage < 1) {
			setPage(maxPage);
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
			key: FilterMode.Disabled,
			label: (
				<div className="sa-settings-filter-option">
					<span>Disabled ⎯ {disabledCount}</span>
					{filterMode === FilterMode.Disabled && <Check size={14} />}
				</div>
			),
			onClick: (): void => {
				setFilterMode(FilterMode.Disabled);
				setPage(1);
			},
		},
	];

	function getFilterLabel(): string {
		switch (filterMode) {
			case FilterMode.Active:
				return `Active ⎯ ${activeCount}`;
			case FilterMode.Disabled:
				return `Disabled ⎯ ${disabledCount}`;
			default:
				return `All accounts ⎯ ${totalCount}`;
		}
	}
	const filterLabel = getFilterLabel();

	const handleRowClick = useCallback((row: ServiceAccountRow): void => {
		setSelectedAccount(row);
	}, []);

	useEffect(() => {
		if (!selectedAccount) {
			return;
		}
		const updated = allAccounts.find((a) => a.id === selectedAccount.id);
		if (!updated) {
			setSelectedAccount(null);
			return;
		}
		if (JSON.stringify(updated) !== JSON.stringify(selectedAccount)) {
			setSelectedAccount(updated);
		}
	}, [allAccounts, selectedAccount]);

	const handleDrawerClose = useCallback((): void => {
		setSelectedAccount(null);
	}, []);

	const handleDrawerSuccess = useCallback(
		(options?: { closeDrawer?: boolean }): void => {
			if (options?.closeDrawer) {
				setSelectedAccount(null);
			}
			refetch();
		},
		[refetch],
	);

	const handleCreateSuccess = useCallback((): void => {
		refetch();
	}, [refetch]);

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
						onClick={(): void => setIsCreateModalOpen(true)}
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
					data={paginatedAccounts}
					loading={isLoading}
					total={filteredAccounts.length}
					currentPage={currentPage}
					pageSize={PAGE_SIZE}
					searchQuery={searchQuery}
					onPageChange={setPage}
					onRowClick={handleRowClick}
				/>
			)}

			<CreateServiceAccountModal
				open={isCreateModalOpen}
				onClose={(): void => setIsCreateModalOpen(false)}
				onSuccess={handleCreateSuccess}
			/>

			<ServiceAccountDrawer
				account={selectedAccount}
				open={selectedAccount !== null}
				onClose={handleDrawerClose}
				onSuccess={handleDrawerSuccess}
			/>
		</>
	);
}

export default ServiceAccountsSettings;
