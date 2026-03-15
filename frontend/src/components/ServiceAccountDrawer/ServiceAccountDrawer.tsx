import { useCallback, useEffect, useState } from 'react';
import { Button } from '@signozhq/button';
import { DrawerWrapper } from '@signozhq/drawer';
import { Key, LayoutGrid, Plus, PowerOff, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { Pagination } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	useListServiceAccountKeys,
	useUpdateServiceAccount,
	useUpdateServiceAccountStatus,
} from 'api/generated/services/serviceaccount';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useRoles } from 'components/RolesSelect';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';

import AddKeyModal from './AddKeyModal';
import DisableAccountModal from './DisableAccountModal';
import KeysTab from './KeysTab';
import OverviewTab from './OverviewTab';
import { ServiceAccountDrawerTab } from './utils';

import './ServiceAccountDrawer.styles.scss';

export interface ServiceAccountDrawerProps {
	account: ServiceAccountRow | null;
	open: boolean;
	onClose: () => void;
	onSuccess: (options?: { closeDrawer?: boolean }) => void;
}

const PAGE_SIZE = 15;

// eslint-disable-next-line sonarjs/cognitive-complexity
function ServiceAccountDrawer({
	account,
	open,
	onClose,
	onSuccess,
}: ServiceAccountDrawerProps): JSX.Element {
	const [activeTab, setActiveTab] = useState<ServiceAccountDrawerTab>(
		ServiceAccountDrawerTab.Overview,
	);
	const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);
	const [localName, setLocalName] = useState('');
	const [localRoles, setLocalRoles] = useState<string[]>([]);
	const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);
	const [keysPage, setKeysPage] = useState(1);

	useEffect(() => {
		if (account) {
			setLocalName(account.name ?? '');
			setLocalRoles(account.roles ?? []);
			setActiveTab(ServiceAccountDrawerTab.Overview);
			setKeysPage(1);
		}
	}, [account]);

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

	const {
		data: keysData,
		isLoading: keysLoading,
		refetch: refetchKeys,
	} = useListServiceAccountKeys(
		{ id: account?.id ?? '' },
		{ query: { enabled: !!account?.id } },
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
	}, [keysLoading, keys.length, keysPage]);

	const {
		mutate: updateAccount,
		isLoading: isSaving,
	} = useUpdateServiceAccount();
	const {
		mutate: updateStatus,
		isLoading: isDisabling,
	} = useUpdateServiceAccountStatus();

	function handleSave(): void {
		if (!account || !isDirty) {
			return;
		}
		updateAccount(
			{
				pathParams: { id: account.id },
				data: { name: localName, email: account.email, roles: localRoles },
			},
			{
				onSuccess: () => {
					toast.success('Service account updated successfully', {
						richColors: true,
					});
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
		);
	}

	function handleDisable(): void {
		if (!account) {
			return;
		}
		updateStatus(
			{
				pathParams: { id: account.id },
				data: { status: 'DISABLED' },
			},
			{
				onSuccess: () => {
					toast.success('Service account disabled', { richColors: true });
					setIsDisableConfirmOpen(false);
					onSuccess({ closeDrawer: true });
				},
				onError: (error) => {
					const errMessage =
						convertToApiError(
							error as AxiosError<RenderErrorResponseDTO, unknown> | null,
						)?.getErrorMessage() || 'Failed to disable service account';
					toast.error(errMessage, { richColors: true });
				},
			},
		);
	}

	const handleClose = useCallback((): void => {
		setIsDisableConfirmOpen(false);
		setIsAddKeyOpen(false);
		onClose();
	}, [onClose]);

	const handleKeySuccess = useCallback((): void => {
		setIsAddKeyOpen(false);
		refetchKeys();
	}, [refetchKeys]);

	const drawerContent = (
		<div className="sa-drawer__layout">
			<div className="sa-drawer__tabs">
				<ToggleGroup
					type="single"
					value={activeTab}
					onValueChange={(val): void => {
						if (val) {
							setActiveTab(val as ServiceAccountDrawerTab);
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
						onClick={(): void => setIsAddKeyOpen(true)}
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
				{activeTab === ServiceAccountDrawerTab.Keys && account && (
					<KeysTab
						accountId={account.id}
						keys={keys}
						isLoading={keysLoading}
						isDisabled={isDisabled}
						currentPage={keysPage}
						pageSize={PAGE_SIZE}
						onRefetch={refetchKeys}
						onAddKeyClick={(): void => setIsAddKeyOpen(true)}
					/>
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
						onChange={(page): void => setKeysPage(page)}
						className="sa-drawer__keys-pagination"
					/>
				) : (
					<>
						{!isDisabled && (
							<Button
								variant="ghost"
								color="destructive"
								className="sa-drawer__footer-btn"
								onClick={(): void => setIsDisableConfirmOpen(true)}
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

			<DisableAccountModal
				open={isDisableConfirmOpen}
				accountName={account?.name}
				isDisabling={isDisabling}
				onCancel={(): void => setIsDisableConfirmOpen(false)}
				onConfirm={handleDisable}
			/>

			{account && (
				<AddKeyModal
					open={isAddKeyOpen}
					accountId={account.id}
					onClose={(): void => setIsAddKeyOpen(false)}
					onSuccess={handleKeySuccess}
				/>
			)}
		</>
	);
}

export default ServiceAccountDrawer;
