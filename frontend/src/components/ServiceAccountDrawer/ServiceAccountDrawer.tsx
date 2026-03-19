import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/button';
import { DrawerWrapper } from '@signozhq/drawer';
import { Key, LayoutGrid, Plus, PowerOff, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { Pagination, Skeleton } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	useGetServiceAccount,
	useListServiceAccountKeys,
	useUpdateServiceAccount,
} from 'api/generated/services/serviceaccount';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { useRoles } from 'components/RolesSelect';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import {
	ServiceAccountRow,
	toServiceAccountRow,
} from 'container/ServiceAccountsSettings/utils';
import {
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryState,
} from 'nuqs';
import { toAPIError } from 'utils/errorUtils';

import AddKeyModal from './AddKeyModal';
import DisableAccountModal from './DisableAccountModal';
import KeysTab from './KeysTab';
import OverviewTab from './OverviewTab';
import { ServiceAccountDrawerTab } from './utils';

import './ServiceAccountDrawer.styles.scss';

export interface ServiceAccountDrawerProps {
	onSuccess: (options?: { closeDrawer?: boolean }) => void;
}

const PAGE_SIZE = 15;

// eslint-disable-next-line sonarjs/cognitive-complexity
function ServiceAccountDrawer({
	onSuccess,
}: ServiceAccountDrawerProps): JSX.Element {
	const [selectedAccountId, setSelectedAccountId] = useQueryState(
		SA_QUERY_PARAMS.ACCOUNT,
	);
	const open = !!selectedAccountId;
	const [activeTab, setActiveTab] = useQueryState(
		SA_QUERY_PARAMS.TAB,
		parseAsStringEnum<ServiceAccountDrawerTab>(
			Object.values(ServiceAccountDrawerTab),
		).withDefault(ServiceAccountDrawerTab.Overview),
	);
	const [keysPage, setKeysPage] = useQueryState(
		SA_QUERY_PARAMS.KEYS_PAGE,
		parseAsInteger.withDefault(1),
	);
	const [, setEditKeyId] = useQueryState(
		SA_QUERY_PARAMS.EDIT_KEY,
		parseAsString.withDefault(''),
	);
	const [, setIsAddKeyOpen] = useQueryState(
		SA_QUERY_PARAMS.ADD_KEY,
		parseAsBoolean.withDefault(false),
	);
	const [, setIsDisableOpen] = useQueryState(
		SA_QUERY_PARAMS.DISABLE_SA,
		parseAsBoolean.withDefault(false),
	);
	const [localName, setLocalName] = useState('');
	const [localRoles, setLocalRoles] = useState<string[]>([]);

	const {
		data: accountData,
		isLoading: isAccountLoading,
		isError: isAccountError,
		error: accountError,
		refetch: refetchAccount,
	} = useGetServiceAccount(
		{ id: selectedAccountId ?? '' },
		{ query: { enabled: !!selectedAccountId } },
	);

	const account = useMemo(
		(): ServiceAccountRow | null =>
			accountData?.data ? toServiceAccountRow(accountData.data) : null,
		[accountData],
	);

	useEffect(() => {
		if (account) {
			setLocalName(account.name ?? '');
			setLocalRoles(account.roles ?? []);
			setKeysPage(1);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account?.id]);

	const isDisabled = account?.status?.toUpperCase() !== 'ACTIVE';

	const isDirty =
		account !== null &&
		(localName !== (account.name ?? '') ||
			JSON.stringify(localRoles) !== JSON.stringify(account.roles ?? []));

	const {
		roles: availableRoles,
		isLoading: rolesLoading,
		isError: rolesError,
		error: rolesErrorObj,
		refetch: refetchRoles,
	} = useRoles();

	const { data: keysData, isLoading: keysLoading } = useListServiceAccountKeys(
		{ id: selectedAccountId ?? '' },
		{ query: { enabled: !!selectedAccountId } },
	);
	const keys = keysData?.data ?? [];

	useEffect(() => {
		if (keysLoading) {
			return;
		}
		const maxPage = Math.max(1, Math.ceil(keys.length / PAGE_SIZE));
		if (keysPage > maxPage) {
			setKeysPage(maxPage);
		}
	}, [keysLoading, keys.length, keysPage, setKeysPage]);

	const { mutate: updateAccount, isLoading: isSaving } = useUpdateServiceAccount(
		{
			mutation: {
				onSuccess: () => {
					toast.success('Service account updated successfully', {
						richColors: true,
					});
					refetchAccount();
					onSuccess({ closeDrawer: false });
				},
				onError: (error) => {
					const errMessage =
						convertToApiError(
							error as AxiosError<RenderErrorResponseDTO, unknown> | null,
						)?.getErrorMessage() || 'Failed to update service account';
					toast.error(errMessage, { richColors: true });
				},
			},
		},
	);

	function handleSave(): void {
		if (!account || !isDirty) {
			return;
		}
		updateAccount({
			pathParams: { id: account.id },
			data: { name: localName, email: account.email, roles: localRoles },
		});
	}

	const handleClose = useCallback((): void => {
		setIsDisableOpen(null);
		setIsAddKeyOpen(null);
		setSelectedAccountId(null);
		setActiveTab(null);
		setKeysPage(null);
		setEditKeyId(null);
	}, [
		setSelectedAccountId,
		setActiveTab,
		setKeysPage,
		setEditKeyId,
		setIsAddKeyOpen,
		setIsDisableOpen,
	]);

	const drawerContent = (
		<div className="sa-drawer__layout">
			<div className="sa-drawer__tabs">
				<ToggleGroup
					type="single"
					value={activeTab}
					onValueChange={(val): void => {
						if (val) {
							setActiveTab(val as ServiceAccountDrawerTab);
							if (val !== ServiceAccountDrawerTab.Keys) {
								setKeysPage(null);
								setEditKeyId(null);
							}
						}
					}}
					className="sa-drawer__tab-group"
				>
					<ToggleGroupItem
						value={ServiceAccountDrawerTab.Overview}
						className="sa-drawer__tab"
					>
						<LayoutGrid size={14} />
						Overview
					</ToggleGroupItem>
					<ToggleGroupItem
						value={ServiceAccountDrawerTab.Keys}
						className="sa-drawer__tab"
					>
						<Key size={14} />
						Keys
						{keys.length > 0 && (
							<span className="sa-drawer__tab-count">{keys.length}</span>
						)}
					</ToggleGroupItem>
				</ToggleGroup>
				{activeTab === ServiceAccountDrawerTab.Keys && (
					<Button
						variant="outlined"
						size="sm"
						color="secondary"
						disabled={isDisabled}
						onClick={(): void => {
							setIsAddKeyOpen(true);
						}}
					>
						<Plus size={12} />
						Add Key
					</Button>
				)}
			</div>

			<div
				className={`sa-drawer__body${
					activeTab === ServiceAccountDrawerTab.Keys ? ' sa-drawer__body--keys' : ''
				}`}
			>
				{isAccountLoading && <Skeleton active paragraph={{ rows: 6 }} />}
				{isAccountError && (
					<ErrorInPlace
						error={toAPIError(
							accountError,
							'An unexpected error occurred while fetching service account details.',
						)}
					/>
				)}
				{!isAccountLoading && !isAccountError && (
					<>
						{activeTab === ServiceAccountDrawerTab.Overview && account && (
							<OverviewTab
								account={account}
								localName={localName}
								onNameChange={setLocalName}
								localRoles={localRoles}
								onRolesChange={setLocalRoles}
								isDisabled={isDisabled}
								availableRoles={availableRoles}
								rolesLoading={rolesLoading}
								rolesError={rolesError}
								rolesErrorObj={rolesErrorObj}
								onRefetchRoles={refetchRoles}
							/>
						)}
						{activeTab === ServiceAccountDrawerTab.Keys && (
							<KeysTab
								keys={keys}
								isLoading={keysLoading}
								isDisabled={isDisabled}
								currentPage={keysPage}
								pageSize={PAGE_SIZE}
							/>
						)}
					</>
				)}
			</div>

			<div className="sa-drawer__footer">
				{activeTab === ServiceAccountDrawerTab.Keys ? (
					<Pagination
						current={keysPage}
						pageSize={PAGE_SIZE}
						total={keys.length}
						showTotal={(total: number, range: number[]): JSX.Element => (
							<>
								<span className="sa-drawer__pagination-range">
									{range[0]} &#8212; {range[1]}
								</span>
								<span className="sa-drawer__pagination-total"> of {total}</span>
							</>
						)}
						showSizeChanger={false}
						hideOnSinglePage
						onChange={(page): void => {
							void setKeysPage(page);
						}}
						className="sa-drawer__keys-pagination"
					/>
				) : (
					<>
						{!isDisabled && (
							<Button
								variant="ghost"
								color="destructive"
								className="sa-drawer__footer-btn"
								onClick={(): void => {
									setIsDisableOpen(true);
								}}
							>
								<PowerOff size={12} />
								Disable Service Account
							</Button>
						)}
						{!isDisabled && (
							<div className="sa-drawer__footer-right">
								<Button
									variant="solid"
									color="secondary"
									size="sm"
									onClick={handleClose}
								>
									<X size={14} />
									Cancel
								</Button>
								<Button
									variant="solid"
									color="primary"
									size="sm"
									loading={isSaving}
									disabled={!isDirty}
									onClick={handleSave}
								>
									Save Changes
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);

	return (
		<>
			<DrawerWrapper
				open={open}
				onOpenChange={(isOpen): void => {
					if (!isOpen) {
						handleClose();
					}
				}}
				direction="right"
				type="panel"
				showCloseButton
				showOverlay={false}
				allowOutsideClick
				header={{ title: 'Service Account Details' }}
				content={drawerContent}
				className="sa-drawer"
			/>

			<DisableAccountModal />

			<AddKeyModal />
		</>
	);
}

export default ServiceAccountDrawer;
