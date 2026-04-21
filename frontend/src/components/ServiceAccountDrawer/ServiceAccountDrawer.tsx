import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { DrawerWrapper } from '@signozhq/drawer';
import { Key, LayoutGrid, Plus, Trash2, X } from '@signozhq/icons';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { toast } from '@signozhq/ui';
import { Pagination, Skeleton } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	getGetServiceAccountRolesQueryKey,
	getListServiceAccountsQueryKey,
	useDeleteServiceAccountRole,
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
import {
	RoleUpdateFailure,
	useServiceAccountRoleManager,
} from 'hooks/serviceAccount/useServiceAccountRoleManager';
import {
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryState,
} from 'nuqs';
import APIError from 'types/api/error';
import { retryOn429, toAPIError } from 'utils/errorUtils';

import AddKeyModal from './AddKeyModal';
import DeleteAccountModal from './DeleteAccountModal';
import KeysTab from './KeysTab';
import OverviewTab from './OverviewTab';
import type { SaveError } from './utils';
import { ServiceAccountDrawerTab } from './utils';

import './ServiceAccountDrawer.styles.scss';

export interface ServiceAccountDrawerProps {
	onSuccess: (options?: { closeDrawer?: boolean }) => void;
}

const PAGE_SIZE = 15;

function toSaveApiError(err: unknown): APIError {
	return (
		convertToApiError(err as AxiosError<RenderErrorResponseDTO>) ??
		toAPIError(err as AxiosError<RenderErrorResponseDTO>)
	);
}

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
	const [localRole, setLocalRole] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [saveErrors, setSaveErrors] = useState<SaveError[]>([]);

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

	const {
		currentRoles,
		isLoading: isRolesLoading,
		applyDiff,
	} = useServiceAccountRoleManager(selectedAccountId ?? '');

	const roleSessionRef = useRef<string | null>(null);

	useEffect(() => {
		if (account?.id) {
			setLocalName(account?.name ?? '');
			setKeysPage(1);
		}
	}, [account?.id, account?.name, setKeysPage]);

	useEffect(() => {
		if (account?.id) {
			setSaveErrors([]);
		}
	}, [account?.id]);

	useEffect(() => {
		if (!account?.id) {
			roleSessionRef.current = null;
		} else if (account.id !== roleSessionRef.current && !isRolesLoading) {
			setLocalRole(currentRoles[0]?.id ?? '');
			roleSessionRef.current = account.id;
		}
	}, [account?.id, currentRoles, isRolesLoading]);

	const isDeleted =
		account?.status?.toUpperCase() === ServiceAccountStatus.Deleted;

	const isDirty =
		account !== null &&
		(localName !== (account.name ?? '') ||
			localRole !== (currentRoles[0]?.id ?? ''));

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

	// the retry for this mutation is safe due to the api being idempotent on backend
	const { mutateAsync: updateMutateAsync } = useUpdateServiceAccount();
	const { mutateAsync: deleteRole } = useDeleteServiceAccountRole({
		mutation: {
			retry: retryOn429,
		},
	});

	const executeRolesOperation = useCallback(
		async (accountId: string): Promise<RoleUpdateFailure[]> => {
			if (localRole === '' && currentRoles[0]?.id) {
				await deleteRole({
					pathParams: { id: accountId, rid: currentRoles[0].id },
				});
				await queryClient.invalidateQueries(
					getGetServiceAccountRolesQueryKey({ id: accountId }),
				);
				return [];
			}
			return applyDiff([localRole].filter(Boolean), availableRoles);
		},
		[localRole, currentRoles, availableRoles, applyDiff, deleteRole, queryClient],
	);

	const retryNameUpdate = useCallback(async (): Promise<void> => {
		if (!account) {
			return;
		}
		try {
			await updateMutateAsync({
				pathParams: { id: account.id },
				data: { name: localName },
			});
			setSaveErrors((prev) => prev.filter((e) => e.context !== 'Name update'));
			refetchAccount();
			queryClient.invalidateQueries(getListServiceAccountsQueryKey());
		} catch (err) {
			setSaveErrors((prev) =>
				prev.map((e) =>
					e.context === 'Name update' ? { ...e, apiError: toSaveApiError(err) } : e,
				),
			);
		}
	}, [account, localName, updateMutateAsync, refetchAccount, queryClient]);

	const handleNameChange = useCallback((name: string): void => {
		setLocalName(name);
		setSaveErrors((prev) => prev.filter((e) => e.context !== 'Name update'));
	}, []);

	const makeRoleRetry = useCallback(
		(
			context: string,
			rawRetry: () => Promise<void>,
		) => async (): Promise<void> => {
			try {
				await rawRetry();
				setSaveErrors((prev) => prev.filter((e) => e.context !== context));
			} catch (err) {
				setSaveErrors((prev) =>
					prev.map((e) =>
						e.context === context ? { ...e, apiError: toSaveApiError(err) } : e,
					),
				);
			}
		},
		[],
	);

	const clearRoleErrors = useCallback((): void => {
		setSaveErrors((prev) =>
			prev.filter(
				(e) => e.context !== 'Roles update' && !e.context.startsWith("Role '"),
			),
		);
	}, []);

	const failuresToSaveErrors = useCallback(
		(failures: RoleUpdateFailure[]): SaveError[] =>
			failures.map((f) => {
				const ctx = `Role '${f.roleName}'`;
				return {
					context: ctx,
					apiError: toSaveApiError(f.error),
					onRetry: makeRoleRetry(ctx, f.onRetry),
				};
			}),
		[makeRoleRetry],
	);

	const retryRolesUpdate = useCallback(async (): Promise<void> => {
		try {
			const failures = await executeRolesOperation(selectedAccountId ?? '');
			if (failures.length === 0) {
				setSaveErrors((prev) => prev.filter((e) => e.context !== 'Roles update'));
			} else {
				setSaveErrors((prev) => {
					const rest = prev.filter((e) => e.context !== 'Roles update');
					return [...rest, ...failuresToSaveErrors(failures)];
				});
			}
		} catch (err) {
			setSaveErrors((prev) =>
				prev.map((e) =>
					e.context === 'Roles update' ? { ...e, apiError: toSaveApiError(err) } : e,
				),
			);
		}
	}, [selectedAccountId, executeRolesOperation, failuresToSaveErrors]);

	const handleSave = useCallback(async (): Promise<void> => {
		if (!account || !isDirty) {
			return;
		}
		setSaveErrors([]);
		setIsSaving(true);
		try {
			const namePromise =
				localName !== (account.name ?? '')
					? updateMutateAsync({
							pathParams: { id: account.id },
							data: { name: localName },
					  })
					: Promise.resolve();

			const [nameResult, rolesResult] = await Promise.allSettled([
				namePromise,
				executeRolesOperation(account.id),
			]);

			const errors: SaveError[] = [];

			if (nameResult.status === 'rejected') {
				errors.push({
					context: 'Name update',
					apiError: toSaveApiError(nameResult.reason),
					onRetry: retryNameUpdate,
				});
			}

			if (rolesResult.status === 'rejected') {
				errors.push({
					context: 'Roles update',
					apiError: toSaveApiError(rolesResult.reason),
					onRetry: retryRolesUpdate,
				});
			} else {
				errors.push(...failuresToSaveErrors(rolesResult.value));
			}

			if (errors.length > 0) {
				setSaveErrors(errors);
			} else {
				toast.success('Service account updated successfully', {
					richColors: true,
					position: 'top-right',
				});
				onSuccess({ closeDrawer: false });
			}

			refetchAccount();
			queryClient.invalidateQueries(getListServiceAccountsQueryKey());
		} finally {
			setIsSaving(false);
		}
	}, [
		account,
		isDirty,
		localName,
		updateMutateAsync,
		executeRolesOperation,
		refetchAccount,
		onSuccess,
		queryClient,
		retryNameUpdate,
		retryRolesUpdate,
		failuresToSaveErrors,
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
								onNameChange={handleNameChange}
								localRole={localRole}
								onRoleChange={(role): void => {
									setLocalRole(role ?? '');
									clearRoleErrors();
								}}
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
