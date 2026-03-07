import { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { Check, ChevronDown, Plus } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { useListServiceAccounts } from 'api/generated/services/serviceaccount';
import CreateServiceAccountModal from 'components/CreateServiceAccountModal/CreateServiceAccountModal';
import ServiceAccountDrawer from 'components/ServiceAccountDrawer/ServiceAccountDrawer';
import ServiceAccountsTable from 'components/ServiceAccountsTable/ServiceAccountsTable';
import useUrlQuery from 'hooks/useUrlQuery';

import { FilterMode, ServiceAccountRow } from './utils';

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
	const [selectedAccount, setSelectedAccount] = useState<ServiceAccountRow | null>(null);

	const {
		data: serviceAccountsData,
		isLoading,
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
				createdAt: sa.createdAt ? String(sa.createdAt) : null,
				updatedAt: sa.updatedAt ? String(sa.updatedAt) : null,
			})),
		[serviceAccountsData],
	);

	const activeCount = useMemo(
		() => allAccounts.filter((a) => a.status?.toUpperCase() === 'ACTIVE').length,
		[allAccounts],
	);

	const disabledCount = useMemo(
		() => allAccounts.filter((a) => a.status?.toUpperCase() !== 'ACTIVE').length,
		[allAccounts],
	);

	const filteredAccounts = useMemo((): ServiceAccountRow[] => {
		let result = allAccounts;

		if (filterMode === FilterMode.Active) {
			result = result.filter((a) => a.status?.toUpperCase() === 'ACTIVE');
		} else if (filterMode === FilterMode.Disabled) {
			result = result.filter((a) => a.status?.toUpperCase() !== 'ACTIVE');
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(a) =>
					a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q),
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

	const filterLabel =
		filterMode === FilterMode.Active
			? `Active ⎯ ${activeCount}`
			: filterMode === FilterMode.Disabled
			? `Disabled ⎯ ${disabledCount}`
			: `All accounts ⎯ ${totalCount}`;

	const handleRowClick = useCallback((row: ServiceAccountRow): void => {
		setSelectedAccount(row);
	}, []);

	const handleDrawerClose = useCallback((): void => {
		setSelectedAccount(null);
	}, []);

	const handleDrawerSuccess = useCallback((): void => {
		refetch();
		setSelectedAccount(null);
	}, [refetch]);

	const handleCreateSuccess = useCallback((): void => {
		refetch();
	}, [refetch]);

	return (
		<>
			<div className="sa-settings">
				<div className="sa-settings__header">
					<h1 className="sa-settings__title">Service Accounts</h1>
					<p className="sa-settings__subtitle">
						Service accounts are used for machine-to-machine authentication via API
						keys.{' '}
						<a
							href="https://signoz.io/docs/service-accounts"
							target="_blank"
							rel="noopener noreferrer"
							className="sa-settings__learn-more"
						>
							Learn more
						</a>
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
