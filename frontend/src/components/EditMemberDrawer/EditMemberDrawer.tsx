import { useCallback, useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { DrawerWrapper } from '@signozhq/drawer';
import { LockKeyhole, RefreshCw, Trash2, X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { Skeleton, Tooltip } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import {
	useCreateResetPasswordToken,
	useDeleteUser,
	useGetResetPasswordToken,
	useGetUser,
	useUpdateMyUserV2,
	useUpdateUser,
} from 'api/generated/services/users';
import { AxiosError } from 'axios';
import { MemberRow } from 'components/MembersTable/MembersTable';
import RolesSelect, { useRoles } from 'components/RolesSelect';
import SaveErrorItem from 'components/ServiceAccountDrawer/SaveErrorItem';
import type { SaveError } from 'components/ServiceAccountDrawer/utils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { MemberStatus } from 'container/MembersSettings/utils';
import {
	MemberRoleUpdateFailure,
	useMemberRoleManager,
} from 'hooks/member/useMemberRoleManager';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useTimezone } from 'providers/Timezone';
import APIError from 'types/api/error';
import { toAPIError } from 'utils/errorUtils';

import DeleteMemberDialog from './DeleteMemberDialog';
import ResetLinkDialog from './ResetLinkDialog';

import './EditMemberDrawer.styles.scss';

const ROOT_USER_TOOLTIP = 'This operation is not supported for the root user';
const SELF_DELETE_TOOLTIP =
	'You cannot perform this action on your own account';

function getDeleteTooltip(
	isRootUser: boolean,
	isSelf: boolean,
): string | undefined {
	if (isRootUser) {
		return ROOT_USER_TOOLTIP;
	}
	if (isSelf) {
		return SELF_DELETE_TOOLTIP;
	}
	return undefined;
}

function getInviteButtonLabel(
	isLoading: boolean,
	existingToken: { expiresAt?: Date } | undefined,
	isExpired: boolean,
	notFound: boolean,
): string {
	if (isLoading) {
		return 'Checking invite...';
	}
	if (existingToken && !isExpired) {
		return 'Copy Invite Link';
	}
	if (isExpired) {
		return 'Regenerate Invite Link';
	}
	if (notFound) {
		return 'Generate Invite Link';
	}
	return 'Copy Invite Link';
}

function toSaveApiError(err: unknown): APIError {
	return (
		convertToApiError(err as AxiosError<RenderErrorResponseDTO>) ??
		toAPIError(err as AxiosError<RenderErrorResponseDTO>)
	);
}

export interface EditMemberDrawerProps {
	member: MemberRow | null;
	open: boolean;
	onClose: () => void;
	onComplete: () => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function EditMemberDrawer({
	member,
	open,
	onClose,
	onComplete,
}: EditMemberDrawerProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const { user: currentUser } = useAppContext();

	const [localDisplayName, setLocalDisplayName] = useState('');
	const [localRole, setLocalRole] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [saveErrors, setSaveErrors] = useState<SaveError[]>([]);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [resetLink, setResetLink] = useState<string | null>(null);
	const [resetLinkExpiresAt, setResetLinkExpiresAt] = useState<string | null>(
		null,
	);
	const [showResetLinkDialog, setShowResetLinkDialog] = useState(false);
	const [hasCopiedResetLink, setHasCopiedResetLink] = useState(false);
	const [linkType, setLinkType] = useState<'invite' | 'reset' | null>(null);

	const isInvited = member?.status === MemberStatus.Invited;
	const isDeleted = member?.status === MemberStatus.Deleted;
	const isSelf = !!member?.id && member.id === currentUser?.id;

	const { showErrorModal } = useErrorModal();

	const {
		data: fetchedUser,
		isLoading: isFetchingUser,
		refetch: refetchUser,
	} = useGetUser(
		{ id: member?.id ?? '' },
		{ query: { enabled: open && !!member?.id } },
	);

	const isRootUser = !!fetchedUser?.data?.isRoot;

	const {
		roles: availableRoles,
		isLoading: rolesLoading,
		isError: rolesError,
		error: rolesErrorObj,
		refetch: refetchRoles,
	} = useRoles();

	const {
		fetchedRoleIds,
		isLoading: isMemberRolesLoading,
		applyDiff,
	} = useMemberRoleManager(member?.id ?? '', open && !!member?.id);

	// Token status query for invited users
	const {
		data: tokenQueryData,
		isLoading: isLoadingTokenStatus,
		isError: tokenNotFound,
	} = useGetResetPasswordToken(
		{ id: member?.id ?? '' },
		{ query: { enabled: open && !!member?.id && isInvited } },
	);

	const existingToken = tokenQueryData?.data;
	const isTokenExpired =
		existingToken != null &&
		new Date(String(existingToken.expiresAt)) < new Date();

	// Create/regenerate token mutation
	const {
		mutateAsync: createTokenMutation,
		isLoading: isGeneratingLink,
	} = useCreateResetPasswordToken();

	const fetchedDisplayName =
		fetchedUser?.data?.displayName ?? member?.name ?? '';
	const fetchedUserId = fetchedUser?.data?.id;
	const fetchedUserDisplayName = fetchedUser?.data?.displayName;

	const roleSessionRef = useRef<string | null>(null);

	useEffect(() => {
		if (fetchedUserId) {
			setLocalDisplayName(fetchedUserDisplayName ?? member?.name ?? '');
		}
	}, [fetchedUserId, fetchedUserDisplayName, member?.name]);

	useEffect(() => {
		if (fetchedUserId) {
			setSaveErrors([]);
		}
	}, [fetchedUserId]);

	useEffect(() => {
		if (!member?.id) {
			roleSessionRef.current = null;
		} else if (member.id !== roleSessionRef.current && !isMemberRolesLoading) {
			setLocalRole(fetchedRoleIds[0] ?? '');
			roleSessionRef.current = member.id;
		}
	}, [member?.id, fetchedRoleIds, isMemberRolesLoading]);

	const isDirty =
		member !== null &&
		fetchedUser != null &&
		(localDisplayName !== fetchedDisplayName ||
			localRole !== (fetchedRoleIds[0] ?? ''));

	const { mutateAsync: updateMyUser } = useUpdateMyUserV2();
	const { mutateAsync: updateUser } = useUpdateUser();

	const { mutate: deleteUser, isLoading: isDeleting } = useDeleteUser({
		mutation: {
			onSuccess: (): void => {
				toast.success(
					isInvited ? 'Invite revoked successfully' : 'Member deleted successfully',
					{ richColors: true, position: 'top-right' },
				);
				setShowDeleteConfirm(false);
				onComplete();
				onClose();
			},
			onError: (err): void => {
				const errMessage = convertToApiError(
					err as AxiosError<RenderErrorResponseDTO, unknown> | null,
				);
				showErrorModal(errMessage as APIError);
			},
		},
	});

	const makeRoleRetry = useCallback(
		(
			context: string,
			rawRetry: () => Promise<void>,
		) => async (): Promise<void> => {
			try {
				await rawRetry();
				setSaveErrors((prev) => prev.filter((e) => e.context !== context));
				refetchUser();
			} catch (err) {
				setSaveErrors((prev) =>
					prev.map((e) =>
						e.context === context ? { ...e, apiError: toSaveApiError(err) } : e,
					),
				);
			}
		},
		[refetchUser],
	);

	const retryNameUpdate = useCallback(async (): Promise<void> => {
		if (!member) {
			return;
		}
		try {
			if (isSelf) {
				await updateMyUser({ data: { displayName: localDisplayName } });
			} else {
				await updateUser({
					pathParams: { id: member.id },
					data: { displayName: localDisplayName },
				});
			}
			setSaveErrors((prev) => prev.filter((e) => e.context !== 'Name update'));
			refetchUser();
		} catch (err) {
			setSaveErrors((prev) =>
				prev.map((e) =>
					e.context === 'Name update' ? { ...e, apiError: toSaveApiError(err) } : e,
				),
			);
		}
	}, [member, isSelf, localDisplayName, updateMyUser, updateUser, refetchUser]);

	const handleSave = useCallback(async (): Promise<void> => {
		if (!member || !isDirty) {
			return;
		}
		setSaveErrors([]);
		setIsSaving(true);
		try {
			const nameChanged = localDisplayName !== fetchedDisplayName;
			const rolesChanged = localRole !== (fetchedRoleIds[0] ?? '');

			const namePromise = nameChanged
				? isSelf
					? updateMyUser({ data: { displayName: localDisplayName } })
					: updateUser({
							pathParams: { id: member.id },
							data: { displayName: localDisplayName },
					  })
				: Promise.resolve();

			const [nameResult, rolesResult] = await Promise.allSettled([
				namePromise,
				rolesChanged
					? applyDiff([localRole].filter(Boolean), availableRoles)
					: Promise.resolve([]),
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
					onRetry: async (): Promise<void> => {
						const failures = await applyDiff(
							[localRole].filter(Boolean),
							availableRoles,
						);
						setSaveErrors((prev) => {
							const rest = prev.filter((e) => e.context !== 'Roles update');
							return [
								...rest,
								...failures.map((f: MemberRoleUpdateFailure) => {
									const ctx = `Role '${f.roleName}'`;
									return {
										context: ctx,
										apiError: toSaveApiError(f.error),
										onRetry: makeRoleRetry(ctx, f.onRetry),
									};
								}),
							];
						});
						refetchUser();
					},
				});
			} else {
				for (const failure of rolesResult.value ?? []) {
					const context = `Role '${failure.roleName}'`;
					errors.push({
						context,
						apiError: toSaveApiError(failure.error),
						onRetry: makeRoleRetry(context, failure.onRetry),
					});
				}
			}

			if (errors.length > 0) {
				setSaveErrors(errors);
			} else {
				toast.success('Member details updated successfully', {
					richColors: true,
					position: 'top-right',
				});
				onComplete();
			}

			refetchUser();
		} finally {
			setIsSaving(false);
		}
	}, [
		member,
		isDirty,
		isSelf,
		localDisplayName,
		localRole,
		fetchedDisplayName,
		fetchedRoleIds,
		updateMyUser,
		updateUser,
		applyDiff,
		availableRoles,
		refetchUser,
		retryNameUpdate,
		makeRoleRetry,
		onComplete,
	]);

	const handleDelete = useCallback((): void => {
		if (!member) {
			return;
		}
		deleteUser({ pathParams: { id: member.id } });
	}, [member, deleteUser]);

	const handleGenerateResetLink = useCallback(async (): Promise<void> => {
		if (!member) {
			return;
		}
		try {
			const response = await createTokenMutation({
				pathParams: { id: member.id },
			});
			if (response?.data?.token) {
				const link = `${window.location.origin}/password-reset?token=${response.data.token}`;
				setResetLink(link);
				setResetLinkExpiresAt(
					response.data.expiresAt
						? formatTimezoneAdjustedTimestamp(
								String(response.data.expiresAt),
								DATE_TIME_FORMATS.DASH_DATETIME,
						  )
						: null,
				);
				setHasCopiedResetLink(false);
				setLinkType(isInvited ? 'invite' : 'reset');
				setShowResetLinkDialog(true);
				onClose();
			} else {
				toast.error('Failed to generate password reset link', {
					richColors: true,
					position: 'top-right',
				});
			}
		} catch (err) {
			const errMsg = convertToApiError(
				err as AxiosError<RenderErrorResponseDTO, unknown> | null,
			);
			showErrorModal(errMsg as APIError);
		}
	}, [member, isInvited, onClose, showErrorModal, createTokenMutation]);

	const [copyState, copyToClipboard] = useCopyToClipboard();
	const handleCopyResetLink = useCallback((): void => {
		if (!resetLink) {
			return;
		}
		copyToClipboard(resetLink);
		setHasCopiedResetLink(true);
		setTimeout(() => setHasCopiedResetLink(false), 2000);
		const message =
			linkType === 'invite'
				? 'Invite link copied to clipboard'
				: 'Reset link copied to clipboard';
		toast.success(message, { richColors: true, position: 'top-right' });
	}, [resetLink, copyToClipboard, linkType]);

	useEffect(() => {
		if (copyState.error) {
			toast.error('Failed to copy link', {
				richColors: true,
				position: 'top-right',
			});
		}
	}, [copyState.error]);

	const handleClose = useCallback((): void => {
		setShowDeleteConfirm(false);
		onClose();
	}, [onClose]);

	const joinedOnLabel = isInvited ? 'Invited On' : 'Joined On';

	const formatTimestamp = useCallback(
		(ts: string | null | undefined): string => {
			if (!ts) {
				return '—';
			}
			const d = new Date(ts);
			if (Number.isNaN(d.getTime())) {
				return '—';
			}
			return formatTimezoneAdjustedTimestamp(ts, DATE_TIME_FORMATS.DASH_DATETIME);
		},
		[formatTimezoneAdjustedTimestamp],
	);

	const drawerBody = isFetchingUser ? (
		<Skeleton active paragraph={{ rows: 6 }} />
	) : (
		<>
			<div className="edit-member-drawer__field">
				<label className="edit-member-drawer__label" htmlFor="member-name">
					Name
				</label>
				<Tooltip title={isRootUser ? ROOT_USER_TOOLTIP : undefined}>
					<Input
						id="member-name"
						value={localDisplayName}
						onChange={(e): void => {
							setLocalDisplayName(e.target.value);
							setSaveErrors((prev) =>
								prev.filter((err) => err.context !== 'Name update'),
							);
						}}
						className="edit-member-drawer__input"
						placeholder="Enter name"
						disabled={isRootUser || isDeleted}
					/>
				</Tooltip>
			</div>

			<div className="edit-member-drawer__field">
				<label className="edit-member-drawer__label" htmlFor="member-email">
					Email Address
				</label>
				<div className="edit-member-drawer__input-wrapper edit-member-drawer__input-wrapper--disabled">
					<span className="edit-member-drawer__email-text">
						{member?.email || '—'}
					</span>
					<LockKeyhole size={16} className="edit-member-drawer__lock-icon" />
				</div>
			</div>

			<div className="edit-member-drawer__field">
				<label className="edit-member-drawer__label" htmlFor="member-role">
					Roles
				</label>
				{isSelf || isRootUser || isDeleted ? (
					<Tooltip
						title={
							isRootUser
								? ROOT_USER_TOOLTIP
								: isDeleted
								? undefined
								: 'You cannot modify your own role'
						}
					>
						<div className="edit-member-drawer__input-wrapper edit-member-drawer__input-wrapper--disabled">
							<div className="edit-member-drawer__disabled-roles">
								{localRole ? (
									<Badge color="vanilla">
										{availableRoles.find((r) => r.id === localRole)?.name ?? localRole}
									</Badge>
								) : (
									<span className="edit-member-drawer__email-text">—</span>
								)}
							</div>
							<LockKeyhole size={16} className="edit-member-drawer__lock-icon" />
						</div>
					</Tooltip>
				) : (
					<RolesSelect
						id="member-role"
						roles={availableRoles}
						loading={rolesLoading}
						isError={rolesError}
						error={rolesErrorObj}
						onRefetch={refetchRoles}
						value={localRole}
						onChange={(role): void => {
							setLocalRole(role ?? '');
							setSaveErrors((prev) =>
								prev.filter(
									(err) =>
										err.context !== 'Roles update' && !err.context.startsWith("Role '"),
								),
							);
						}}
						placeholder="Select role"
						allowClear={false}
					/>
				)}
			</div>

			<div className="edit-member-drawer__meta">
				<div className="edit-member-drawer__meta-item">
					<span className="edit-member-drawer__meta-label">Status</span>
					{member?.status === MemberStatus.Active ? (
						<Badge color="forest" variant="outline">
							ACTIVE
						</Badge>
					) : member?.status === MemberStatus.Deleted ? (
						<Badge color="cherry" variant="outline">
							DELETED
						</Badge>
					) : (
						<Badge color="amber" variant="outline">
							INVITED
						</Badge>
					)}
				</div>

				<div className="edit-member-drawer__meta-item">
					<span className="edit-member-drawer__meta-label">{joinedOnLabel}</span>
					<Badge color="vanilla">{formatTimestamp(member?.joinedOn)}</Badge>
				</div>
				{!isInvited && (
					<div className="edit-member-drawer__meta-item">
						<span className="edit-member-drawer__meta-label">Last Modified</span>
						<Badge color="vanilla">{formatTimestamp(member?.updatedAt)}</Badge>
					</div>
				)}
			</div>

			{saveErrors.length > 0 && (
				<div className="edit-member-drawer__save-errors">
					{saveErrors.map((e) => (
						<SaveErrorItem
							key={e.context}
							context={e.context}
							apiError={e.apiError}
							onRetry={e.onRetry}
						/>
					))}
				</div>
			)}
		</>
	);

	const drawerContent = (
		<div className="edit-member-drawer__layout">
			<div className="edit-member-drawer__body">{drawerBody}</div>

			{!isDeleted && (
				<div className="edit-member-drawer__footer">
					<div className="edit-member-drawer__footer-left">
						<Tooltip title={getDeleteTooltip(isRootUser, isSelf)}>
							<span className="edit-member-drawer__tooltip-wrapper">
								<Button
									className="edit-member-drawer__footer-btn edit-member-drawer__footer-btn--danger"
									onClick={(): void => setShowDeleteConfirm(true)}
									disabled={isRootUser || isSelf}
								>
									<Trash2 size={12} />
									{isInvited ? 'Revoke Invite' : 'Delete Member'}
								</Button>
							</span>
						</Tooltip>

						<div className="edit-member-drawer__footer-divider" />
						<Tooltip title={isRootUser ? ROOT_USER_TOOLTIP : undefined}>
							<span className="edit-member-drawer__tooltip-wrapper">
								<Button
									className="edit-member-drawer__footer-btn edit-member-drawer__footer-btn--warning"
									onClick={handleGenerateResetLink}
									disabled={isGeneratingLink || isRootUser || isLoadingTokenStatus}
								>
									<RefreshCw size={12} />
									{isGeneratingLink
										? 'Generating...'
										: isInvited
										? getInviteButtonLabel(
												isLoadingTokenStatus,
												existingToken,
												isTokenExpired,
												tokenNotFound,
										  )
										: 'Generate Password Reset Link'}
								</Button>
							</span>
						</Tooltip>
					</div>

					<div className="edit-member-drawer__footer-right">
						<Button variant="solid" color="secondary" size="sm" onClick={handleClose}>
							<X size={14} />
							Cancel
						</Button>

						<Button
							variant="solid"
							color="primary"
							size="sm"
							disabled={!isDirty || isSaving || isRootUser}
							onClick={handleSave}
						>
							{isSaving ? 'Saving...' : 'Save Member Details'}
						</Button>
					</div>
				</div>
			)}
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
				header={{ title: 'Member Details' }}
				content={drawerContent}
				className="edit-member-drawer"
			/>

			<ResetLinkDialog
				open={showResetLinkDialog}
				linkType={linkType}
				resetLink={resetLink}
				expiresAt={resetLinkExpiresAt}
				hasCopied={hasCopiedResetLink}
				onClose={(): void => {
					setShowResetLinkDialog(false);
				}}
				onCopy={handleCopyResetLink}
			/>

			<DeleteMemberDialog
				open={showDeleteConfirm}
				isInvited={isInvited}
				member={member}
				isDeleting={isDeleting}
				onClose={(): void => setShowDeleteConfirm(false)}
				onConfirm={handleDelete}
			/>
		</>
	);
}

export default EditMemberDrawer;
