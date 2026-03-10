import { useCallback, useEffect, useState } from 'react';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { DrawerWrapper } from '@signozhq/drawer';
import {
	Check,
	Key,
	LayoutGrid,
	Plus,
	PowerOff,
	Trash2,
	X,
} from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
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
import KeysTab from './KeysTab';
import OverviewTab from './OverviewTab';

import './ServiceAccountDrawer.styles.scss';

export interface ServiceAccountDrawerProps {
	account: ServiceAccountRow | null;
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function ServiceAccountDrawer({
	account,
	open,
	onClose,
	onSuccess,
}: ServiceAccountDrawerProps): JSX.Element {
	const [activeTab, setActiveTab] = useState<'overview' | 'keys'>('overview');
	const [isActivateConfirmOpen, setIsActivateConfirmOpen] = useState(false);
	const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);
	const [localName, setLocalName] = useState('');
	const [localRoles, setLocalRoles] = useState<string[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [isDisabling, setIsDisabling] = useState(false);
	const [isActivating, setIsActivating] = useState(false);
	const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);

	useEffect(() => {
		if (account) {
			setLocalName(account.name ?? '');
			setLocalRoles(account.roles ?? []);
			setActiveTab('overview');
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

	const { mutateAsync: updateAccount } = useUpdateServiceAccount();
	const { mutateAsync: updateStatus } = useUpdateServiceAccountStatus();

	const handleSave = useCallback(async (): Promise<void> => {
		if (!account || !isDirty) {
			return;
		}
		setIsSaving(true);
		try {
			await updateAccount({
				pathParams: { id: account.id },
				data: { name: localName, email: account.email, roles: localRoles },
			});
			toast.success('Service account updated successfully', { richColors: true });
			onSuccess();
		} catch (error: unknown) {
			const errMessage =
				convertToApiError(
					error as AxiosError<RenderErrorResponseDTO, unknown> | null,
				)?.getErrorMessage() || 'Failed to update service account';
			toast.error(errMessage, { richColors: true });
		} finally {
			setIsSaving(false);
		}
	}, [account, isDirty, localName, localRoles, updateAccount, onSuccess]);

	const handleDisable = useCallback(async (): Promise<void> => {
		if (!account) {
			return;
		}
		setIsDisabling(true);
		try {
			await updateStatus({
				pathParams: { id: account.id },
				data: { status: 'DISABLED' },
			});
			toast.success('Service account disabled', { richColors: true });
			setIsDisableConfirmOpen(false);
			onSuccess();
		} catch (error: unknown) {
			const errMessage =
				convertToApiError(
					error as AxiosError<RenderErrorResponseDTO, unknown> | null,
				)?.getErrorMessage() || 'Failed to disable service account';
			toast.error(errMessage, { richColors: true });
		} finally {
			setIsDisabling(false);
		}
	}, [account, updateStatus, onSuccess]);

	const handleActivate = useCallback(async (): Promise<void> => {
		if (!account) {
			return;
		}
		setIsActivating(true);
		try {
			await updateStatus({
				pathParams: { id: account.id },
				data: { status: 'ACTIVE' },
			});
			toast.success('Service account activated', { richColors: true });
			setIsActivateConfirmOpen(false);
			onSuccess();
		} catch (error: unknown) {
			const errMessage =
				convertToApiError(
					error as AxiosError<RenderErrorResponseDTO, unknown> | null,
				)?.getErrorMessage() || 'Failed to activate service account';
			toast.error(errMessage, { richColors: true });
		} finally {
			setIsActivating(false);
		}
	}, [account, updateStatus, onSuccess]);

	const handleClose = useCallback((): void => {
		setIsActivateConfirmOpen(false);
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
							setActiveTab(val as 'overview' | 'keys');
						}
					}}
					className="sa-drawer__tab-group"
				>
					<ToggleGroupItem value="overview" className="sa-drawer__tab">
						<LayoutGrid size={14} />
						Overview
					</ToggleGroupItem>
					<ToggleGroupItem value="keys" className="sa-drawer__tab">
						<Key size={14} />
						Keys
						{keys.length > 0 && (
							<span className="sa-drawer__tab-count">{keys.length}</span>
						)}
					</ToggleGroupItem>
				</ToggleGroup>
				{activeTab === 'keys' && (
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
					activeTab === 'keys' ? ' sa-drawer__body--keys' : ''
				}`}
			>
				{activeTab === 'overview' && account && (
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
				{activeTab === 'keys' && account && (
					<KeysTab
						accountId={account.id}
						keys={keys}
						isLoading={keysLoading}
						isDisabled={isDisabled}
						onRefetch={refetchKeys}
						onAddKeyClick={(): void => setIsAddKeyOpen(true)}
					/>
				)}
			</div>

			<div className="sa-drawer__footer">
				{activeTab === 'keys' ? (
					<span className="sa-drawer__pagination">
						{keys.length > 0 ? `1 \u2014 ${keys.length} of ${keys.length}` : ''}
					</span>
				) : (
					<>
						{isDisabled ? (
							<Button
								variant="ghost"
								color="primary"
								className="sa-drawer__footer-btn"
								onClick={(): void => setIsActivateConfirmOpen(true)}
							>
								<Check size={12} />
								Activate Service Account
							</Button>
						) : (
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
									disabled={!isDirty || isSaving}
									onClick={handleSave}
								>
									{isSaving ? 'Saving...' : 'Save Changes'}
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

			{/* Activate confirm dialog */}
			<DialogWrapper
				open={isActivateConfirmOpen}
				onOpenChange={(isOpen): void => {
					if (!isOpen) {
						setIsActivateConfirmOpen(false);
					}
				}}
				title={`Activate service account ${account?.name ?? ''}?`}
				width="narrow"
				className="alert-dialog sa-activate-dialog"
				showCloseButton={false}
				disableOutsideClick={false}
			>
				<p className="sa-activate-dialog__body">
					Reactivating this service account will restore access for all its keys and
					any systems using them.
				</p>
				<DialogFooter className="sa-activate-dialog__footer">
					<Button
						variant="solid"
						color="secondary"
						size="sm"
						onClick={(): void => setIsActivateConfirmOpen(false)}
					>
						<X size={12} />
						Cancel
					</Button>
					<Button
						variant="solid"
						color="primary"
						size="sm"
						disabled={isActivating}
						onClick={handleActivate}
					>
						<Check size={12} />
						{isActivating ? 'Activating...' : 'Activate'}
					</Button>
				</DialogFooter>
			</DialogWrapper>

			{/* Disable confirm dialog */}
			<DialogWrapper
				open={isDisableConfirmOpen}
				onOpenChange={(isOpen): void => {
					if (!isOpen) {
						setIsDisableConfirmOpen(false);
					}
				}}
				title={`Disable service account ${account?.name ?? ''}?`}
				width="narrow"
				className="alert-dialog delete-dialog"
				showCloseButton={false}
				disableOutsideClick={false}
			>
				<p className="delete-dialog__body">
					Disabling this service account will revoke access for all its keys. Any
					systems using this account will lose access immediately.
				</p>
				<DialogFooter className="delete-dialog__footer">
					<Button
						variant="solid"
						color="secondary"
						size="sm"
						onClick={(): void => setIsDisableConfirmOpen(false)}
					>
						<X size={12} />
						Cancel
					</Button>
					<Button
						variant="solid"
						color="destructive"
						size="sm"
						disabled={isDisabling}
						onClick={handleDisable}
					>
						<Trash2 size={12} />
						{isDisabling ? 'Disabling...' : 'Disable'}
					</Button>
				</DialogFooter>
			</DialogWrapper>

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
