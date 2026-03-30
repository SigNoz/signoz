import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { DrawerWrapper } from '@signozhq/drawer';
import { Key, LayoutGrid, Plus, Trash2, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { Pagination, Skeleton } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	getListServiceAccountsQueryKey,
	useGetServiceAccount,
	useListServiceAccountKeys,
	useUpdateServiceAccount,
} from 'api/generated/services/serviceaccount';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { useRoles } from 'components/RolesSelect';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import {
	ServiceAccountRow,
	ServiceAccountStatus,
	toServiceAccountRow,
} from 'container/ServiceAccountsSettings/utils';
import type { RoleUpdateFailure } from 'hooks/serviceAccount/useServiceAccountRoleManager';
import { useServiceAccountRoleManager } from 'hooks/serviceAccount/useServiceAccountRoleManager';
import {
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryState,
} from 'nuqs';
import { toAPIError } from 'utils/errorUtils';

import AddKeyModal from './AddKeyModal';
import DeleteAccountModal from './DeleteAccountModal';
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
	const [, setIsDeleteOpen] = useQueryState(
		SA_QUERY_PARAMS.DELETE_SA,
		parseAsBoolean.withDefault(false),
	);
	const [localName, setLocalName] = useState('');
	const [localRoles, setLocalRoles] = useState<string[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [saveErrors, setSaveErrors] = useState<string[]>([]);

	const queryClient = useQueryClient();

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

	const { currentRoles, applyDiff } = useServiceAccountRoleManager(
		selectedAccountId ?? '',
	);

	useEffect(() => {
		if (account) {
			setLocalName(account.name ?? '');
			setKeysPage(1);
		}
		setSaveErrors([]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account?.id]);

	useEffect(() => {
		setLocalRoles(currentRoles.map((r) => r.id).filter(Boolean) as string[]);
	}, [currentRoles]);

	const isDeleted =
		account?.status?.toUpperCase() === ServiceAccountStatus.Deleted;

	const isDirty =
		account !== null &&
		(localName !== (account.name ?? '') ||
			JSON.stringify([...localRoles].sort()) !==
				JSON.stringify([...currentRoles.map((r) => r.id).filter(Boolean)].sort()));

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

	const { mutateAsync: updateMutateAsync } = useUpdateServiceAccount();

	const handleSave = useCallback(async (): Promise<void> => {
		if (!account || !isDirty) {
			return;
		}
		setSaveErrors([]);
		setIsSaving(true);
		try {
			const [nameResult, rolesResult] = await Promise.allSettled([
				updateMutateAsync({
					pathParams: { id: account.id },
					data: { name: localName },
				}),
				applyDiff(localRoles, availableRoles),
			]);

			const errors: string[] = [];

			if (nameResult.status === 'rejected') {
				const apiError = convertToApiError(
					nameResult.reason as AxiosError<RenderErrorResponseDTO>,
				);
				const message = apiError?.getErrorMessage() ?? 'Unknown error';
				errors.push(`Name: ${message}`);
			}

			const roleFailures: RoleUpdateFailure[] =
				rolesResult.status === 'fulfilled' ? rolesResult.value : [];
			for (const failure of roleFailures) {
				const apiError = convertToApiError(
					failure.error as AxiosError<RenderErrorResponseDTO>,
				);
				const message = apiError?.getErrorMessage() ?? 'Unknown error';
				errors.push(`Role '${failure.roleName}': ${message}`);
			}

			if (errors.length > 0) {
				setSaveErrors(errors);
			} else {
				toast.success('Service account updated successfully', {
					richColors: true,
				});
			}

			refetchAccount();
			onSuccess({ closeDrawer: false });
			queryClient.invalidateQueries(getListServiceAccountsQueryKey());
		} finally {
			setIsSaving(false);
		}
	}, [
		account,
		isDirty,
		localName,
		localRoles,
		availableRoles,
		updateMutateAsync,
		applyDiff,
		refetchAccount,
		onSuccess,
		queryClient,
	]);

	const handleClose = useCallback((): void => {
		setIsDeleteOpen(null);
		setIsAddKeyOpen(null);
		setSelectedAccountId(null);
		setActiveTab(null);
		setKeysPage(null);
		setEditKeyId(null);
		setSaveErrors([]);
	}, [
		setSelectedAccountId,
		setActiveTab,
		setKeysPage,
		setEditKeyId,
		setIsAddKeyOpen,
		setIsDeleteOpen,
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
						disabled={isDeleted}
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
								isDisabled={isDeleted}
								availableRoles={availableRoles}
								rolesLoading={rolesLoading}
								rolesError={rolesError}
								rolesErrorObj={rolesErrorObj}
								onRefetchRoles={refetchRoles}
								saveErrors={saveErrors}
							/>
						)}
						{activeTab === ServiceAccountDrawerTab.Keys && (
							<KeysTab
								keys={keys}
								isLoading={keysLoading}
								isDisabled={isDeleted}
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
						{!isDeleted && (
							<Button
								variant="ghost"
								color="destructive"
								className="sa-drawer__footer-btn"
								onClick={(): void => {
									setIsDeleteOpen(true);
								}}
							>
								<Trash2 size={12} />
								Delete Service Account
							</Button>
						)}
						{!isDeleted && (
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

			<DeleteAccountModal />

			<AddKeyModal />
		</>
	);
}

export default ServiceAccountDrawer;
