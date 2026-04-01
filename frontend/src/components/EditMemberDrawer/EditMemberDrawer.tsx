import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { DrawerWrapper } from '@signozhq/drawer';
import { LockKeyhole, RefreshCw, Trash2, X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { Skeleton } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import {
	useGetUser,
	useUpdateMyUserV2,
	useUpdateUser,
} from 'api/generated/services/users';
import { AxiosError } from 'axios';
import RolesSelect, { useRoles } from 'components/RolesSelect';
import SaveErrorItem from 'components/ServiceAccountDrawer/SaveErrorItem';
import type { SaveError } from 'components/ServiceAccountDrawer/utils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { MEMBER_QUERY_PARAMS } from 'container/MembersSettings/constants';
import { MemberStatus } from 'container/MembersSettings/utils';
import { toMemberRow } from 'container/MembersSettings/utils';
import {
	MemberRoleUpdateFailure,
	useMemberRoleManager,
} from 'hooks/member/useMemberRoleManager';
import { parseAsBoolean, parseAsStringEnum, useQueryState } from 'nuqs';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';
import APIError from 'types/api/error';
import { toAPIError } from 'utils/errorUtils';

import DeleteMemberDialog from './DeleteMemberDialog';
import ResetLinkDialog from './ResetLinkDialog';

import './EditMemberDrawer.styles.scss';

function toSaveApiError(err: unknown): APIError {
	return (
		convertToApiError(err as AxiosError<RenderErrorResponseDTO>) ??
		toAPIError(err as AxiosError<RenderErrorResponseDTO>)
	);
}

function areSortedArraysEqual(a: string[], b: string[]): boolean {
	return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

export interface EditMemberDrawerProps {
	onComplete: () => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function EditMemberDrawer({ onComplete }: EditMemberDrawerProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const { user: currentUser } = useAppContext();

	const [memberId, setMemberId] = useQueryState(MEMBER_QUERY_PARAMS.MEMBER);
	const [, setIsDeleteOpen] = useQueryState(
		MEMBER_QUERY_PARAMS.DELETE_MEMBER,
		parseAsBoolean.withDefault(false),
	);
	const [resetLinkType, setResetLinkType] = useQueryState(
		MEMBER_QUERY_PARAMS.RESET_LINK,
		parseAsStringEnum<'invite' | 'reset'>(['invite', 'reset']),
	);

	const open = !!memberId && !resetLinkType;

	const [localDisplayName, setLocalDisplayName] = useState('');
	const [localRoles, setLocalRoles] = useState<string[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [saveErrors, setSaveErrors] = useState<SaveError[]>([]);

	const {
		data: fetchedUser,
		isLoading: isFetchingUser,
		refetch: refetchUser,
	} = useGetUser({ id: memberId ?? '' }, { query: { enabled: !!memberId } });

	const member = useMemo(
		() => (fetchedUser?.data ? toMemberRow(fetchedUser.data) : null),
		[fetchedUser],
	);

	const {
		roles: availableRoles,
		isLoading: rolesLoading,
		isError: rolesError,
		error: rolesErrorObj,
		refetch: refetchRoles,
	} = useRoles();

	const { fetchedRoleIds, applyDiff } = useMemberRoleManager(
		memberId ?? '',
		!!memberId,
	);

	const fetchedDisplayName =
		fetchedUser?.data?.displayName ?? member?.name ?? '';
	const fetchedUserId = fetchedUser?.data?.id;
	const fetchedUserDisplayName = fetchedUser?.data?.displayName;

	useEffect(() => {
		if (fetchedUserId) {
			setLocalDisplayName(fetchedUserDisplayName ?? member?.name ?? '');
		}
		setSaveErrors([]);
	}, [fetchedUserId, fetchedUserDisplayName, member?.name]);

	useEffect(() => {
		setLocalRoles(fetchedRoleIds);
	}, [fetchedRoleIds]);

	const isInvited = member?.status === MemberStatus.Invited;
	const isSelf = !!memberId && memberId === currentUser?.id;

	const isDirty =
		member !== null &&
		fetchedUser != null &&
		(localDisplayName !== fetchedDisplayName ||
			!areSortedArraysEqual(localRoles, fetchedRoleIds));

	const { mutateAsync: updateMyUser } = useUpdateMyUserV2();
	const { mutateAsync: updateUser } = useUpdateUser();

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
		if (!memberId) {
			return;
		}
		try {
			if (isSelf) {
				await updateMyUser({ data: { displayName: localDisplayName } });
			} else {
				await updateUser({
					pathParams: { id: memberId },
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
	}, [
		memberId,
		isSelf,
		localDisplayName,
		updateMyUser,
		updateUser,
		refetchUser,
	]);

	const handleSave = useCallback(async (): Promise<void> => {
		if (!memberId || !isDirty) {
			return;
		}
		setSaveErrors([]);
		setIsSaving(true);
		try {
			const nameChanged = localDisplayName !== fetchedDisplayName;
			const rolesChanged = !areSortedArraysEqual(localRoles, fetchedRoleIds);

			const namePromise = nameChanged
				? isSelf
					? updateMyUser({ data: { displayName: localDisplayName } })
					: updateUser({
							pathParams: { id: memberId },
							data: { displayName: localDisplayName },
					  })
				: Promise.resolve();

			const [nameResult, rolesResult] = await Promise.allSettled([
				namePromise,
				rolesChanged ? applyDiff(localRoles, availableRoles) : Promise.resolve([]),
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
						const failures = await applyDiff(localRoles, availableRoles);
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
				toast.success('Member details updated successfully', { richColors: true });
				onComplete();
			}

			refetchUser();
		} finally {
			setIsSaving(false);
		}
	}, [
		memberId,
		isDirty,
		isSelf,
		localDisplayName,
		localRoles,
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

	const handleClose = useCallback((): void => {
		setMemberId(null);
		setIsDeleteOpen(null);
		setResetLinkType(null);
		setSaveErrors([]);
	}, [setMemberId, setIsDeleteOpen, setResetLinkType]);

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
				/>
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
				{isSelf ? (
					<div className="edit-member-drawer__input-wrapper edit-member-drawer__input-wrapper--disabled">
						<div className="edit-member-drawer__disabled-roles">
							{localRoles.length > 0 ? (
								localRoles.map((roleId) => {
									const role = availableRoles.find((r) => r.id === roleId);
									return (
										<Badge key={roleId} color="vanilla">
											{role?.name ?? roleId}
										</Badge>
									);
								})
							) : (
								<span className="edit-member-drawer__email-text">—</span>
							)}
						</div>
						<LockKeyhole size={16} className="edit-member-drawer__lock-icon" />
					</div>
				) : (
					<RolesSelect
						id="member-role"
						mode="multiple"
						roles={availableRoles}
						loading={rolesLoading}
						isError={rolesError}
						error={rolesErrorObj}
						onRefetch={refetchRoles}
						value={localRoles}
						onChange={(roles): void => {
							setLocalRoles(roles);
							setSaveErrors((prev) =>
								prev.filter(
									(err) =>
										err.context !== 'Roles update' && !err.context.startsWith("Role '"),
								),
							);
						}}
						className="edit-member-drawer__role-select"
						placeholder="Select roles"
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

			<div className="edit-member-drawer__footer">
				<div className="edit-member-drawer__footer-left">
					<Button
						className="edit-member-drawer__footer-btn edit-member-drawer__footer-btn--danger"
						onClick={(): void => {
							void setIsDeleteOpen(true);
						}}
					>
						<Trash2 size={12} />
						{isInvited ? 'Revoke Invite' : 'Delete Member'}
					</Button>

					<div className="edit-member-drawer__footer-divider" />
					<Button
						className="edit-member-drawer__footer-btn edit-member-drawer__footer-btn--warning"
						onClick={(): void => {
							void setResetLinkType(isInvited ? 'invite' : 'reset');
						}}
					>
						<RefreshCw size={12} />
						{isInvited ? 'Copy Invite Link' : 'Generate Password Reset Link'}
					</Button>
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
						disabled={!isDirty || isSaving}
						onClick={handleSave}
					>
						{isSaving ? 'Saving...' : 'Save Member Details'}
					</Button>
				</div>
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
				header={{ title: 'Member Details' }}
				content={drawerContent}
				className="edit-member-drawer"
			/>

			<DeleteMemberDialog />

			<ResetLinkDialog />
		</>
	);
}

export default EditMemberDrawer;
