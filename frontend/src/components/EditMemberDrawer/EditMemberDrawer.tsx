import { useCallback, useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { DrawerWrapper } from '@signozhq/drawer';
import {
	Check,
	ChevronDown,
	Copy,
	LockKeyhole,
	RefreshCw,
	Trash2,
	X,
} from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { Select } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import {
	getResetPasswordToken,
	useDeleteUser,
	useUpdateUserDeprecated,
} from 'api/generated/services/users';
import { AxiosError } from 'axios';
import { MemberRow } from 'components/MembersTable/MembersTable';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { MemberStatus } from 'container/MembersSettings/utils';
import { capitalize } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';
import { ROLES } from 'types/roles';
import { popupContainer } from 'utils/selectPopupContainer';

import './EditMemberDrawer.styles.scss';

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

	const [displayName, setDisplayName] = useState('');
	const [selectedRole, setSelectedRole] = useState<ROLES>('VIEWER');
	const [isGeneratingLink, setIsGeneratingLink] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [resetLink, setResetLink] = useState<string | null>(null);
	const [showResetLinkDialog, setShowResetLinkDialog] = useState(false);
	const [hasCopiedResetLink, setHasCopiedResetLink] = useState(false);
	const [linkType, setLinkType] = useState<'invite' | 'reset' | null>(null);

	const isInvited = member?.status === MemberStatus.Invited;

	const { mutate: updateUser, isLoading: isSaving } = useUpdateUserDeprecated({
		mutation: {
			onSuccess: (): void => {
				toast.success('Member details updated successfully', { richColors: true });
				onComplete();
				onClose();
			},
			onError: (err): void => {
				const errMessage =
					convertToApiError(
						err as AxiosError<RenderErrorResponseDTO, unknown> | null,
					)?.getErrorMessage() || 'An error occurred';
				toast.error(`Failed to update member details: ${errMessage}`, {
					richColors: true,
				});
			},
		},
	});

	const { mutate: deleteUser, isLoading: isDeleting } = useDeleteUser({
		mutation: {
			onSuccess: (): void => {
				toast.success(
					isInvited ? 'Invite revoked successfully' : 'Member deleted successfully',
					{ richColors: true },
				);
				setShowDeleteConfirm(false);
				onComplete();
				onClose();
			},
			onError: (err): void => {
				const errMessage =
					convertToApiError(
						err as AxiosError<RenderErrorResponseDTO, unknown> | null,
					)?.getErrorMessage() || 'An error occurred';
				const prefix = isInvited
					? 'Failed to revoke invite'
					: 'Failed to delete member';
				toast.error(`${prefix}: ${errMessage}`, { richColors: true });
			},
		},
	});

	useEffect(() => {
		if (member) {
			setDisplayName(member.name ?? '');
			setSelectedRole(member.role);
		}
	}, [member]);

	const isDirty =
		member !== null &&
		(displayName !== (member.name ?? '') || selectedRole !== member.role);

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

	const handleSave = useCallback((): void => {
		if (!member || !isDirty) {
			return;
		}
		updateUser({
			pathParams: { id: member.id },
			data: { id: member.id, displayName, role: selectedRole },
		});
	}, [member, isDirty, displayName, selectedRole, updateUser]);

	const handleDelete = useCallback((): void => {
		if (!member) {
			return;
		}
		deleteUser({
			pathParams: { id: member.id },
		});
	}, [member, deleteUser]);

	const handleGenerateResetLink = useCallback(async (): Promise<void> => {
		if (!member) {
			return;
		}
		setIsGeneratingLink(true);
		try {
			const response = await getResetPasswordToken({ id: member.id });
			if (response?.data?.token) {
				const link = `${window.location.origin}/password-reset?token=${response.data.token}`;
				setResetLink(link);
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
		} catch {
			toast.error('Failed to generate password reset link', {
				richColors: true,
				position: 'top-right',
			});
		} finally {
			setIsGeneratingLink(false);
		}
	}, [member, isInvited, setLinkType, onClose]);

	const [copyState, copyToClipboard] = useCopyToClipboard();
	const handleCopyResetLink = useCallback(async (): Promise<void> => {
		if (!resetLink) {
			return;
		}
		copyToClipboard(resetLink);

		setHasCopiedResetLink(true);
		setTimeout(() => setHasCopiedResetLink(false), 2000);
		toast.success(
			linkType === 'invite'
				? 'Invite link copied to clipboard'
				: 'Reset link copied to clipboard',
			{ richColors: true },
		);
	}, [resetLink, copyToClipboard, linkType]);

	useEffect(() => {
		if (copyState.error) {
			toast.error('Failed to copy link', {
				richColors: true,
			});
		}
	}, [copyState.error]);

	const handleClose = useCallback((): void => {
		setShowDeleteConfirm(false);
		onClose();
	}, [onClose]);

	const joinedOnLabel = isInvited ? 'Invited On' : 'Joined On';

	const drawerContent = (
		<div className="edit-member-drawer__layout">
			<div className="edit-member-drawer__body">
				<div className="edit-member-drawer__field">
					<label className="edit-member-drawer__label" htmlFor="member-name">
						Name
					</label>
					<Input
						id="member-name"
						value={displayName}
						onChange={(e): void => setDisplayName(e.target.value)}
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
					<Select
						id="member-role"
						value={selectedRole}
						onChange={(role): void => setSelectedRole(role as ROLES)}
						className="edit-member-drawer__role-select"
						suffixIcon={<ChevronDown size={14} />}
						getPopupContainer={popupContainer}
					>
						<Select.Option value="ADMIN">{capitalize('ADMIN')}</Select.Option>
						<Select.Option value="EDITOR">{capitalize('EDITOR')}</Select.Option>
						<Select.Option value="VIEWER">{capitalize('VIEWER')}</Select.Option>
					</Select>
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
			</div>

			<div className="edit-member-drawer__footer">
				<div className="edit-member-drawer__footer-left">
					<Button
						className="edit-member-drawer__footer-btn edit-member-drawer__footer-btn--danger"
						onClick={(): void => setShowDeleteConfirm(true)}
					>
						<Trash2 size={12} />
						{isInvited ? 'Revoke Invite' : 'Delete Member'}
					</Button>

					<div className="edit-member-drawer__footer-divider" />
					<Button
						className="edit-member-drawer__footer-btn edit-member-drawer__footer-btn--warning"
						onClick={handleGenerateResetLink}
						disabled={isGeneratingLink}
					>
						<RefreshCw size={12} />
						{isGeneratingLink
							? 'Generating...'
							: isInvited
							? 'Copy Invite Link'
							: 'Generate Password Reset Link'}
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

	const deleteDialogTitle = isInvited ? 'Revoke Invite' : 'Delete Member';
	const deleteDialogBody = isInvited ? (
		<>
			Are you sure you want to revoke the invite for{' '}
			<strong>{member?.email}</strong>? They will no longer be able to join the
			workspace using this invite.
		</>
	) : (
		<>
			Are you sure you want to delete{' '}
			<strong>{member?.name || member?.email}</strong>? This will remove their
			access to the workspace.
		</>
	);
	const deleteConfirmLabel = isInvited ? 'Revoke Invite' : 'Delete Member';

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

			<DialogWrapper
				open={showResetLinkDialog}
				onOpenChange={(isOpen): void => {
					if (!isOpen) {
						setShowResetLinkDialog(false);
						setLinkType(null);
					}
				}}
				title={linkType === 'invite' ? 'Invite Link' : 'Password Reset Link'}
				showCloseButton
				width="base"
				className="reset-link-dialog"
			>
				<div className="reset-link-dialog__content">
					<p className="reset-link-dialog__description">
						{linkType === 'invite'
							? 'Share this one-time link with the team member to complete their account setup.'
							: 'This creates a one-time link the team member can use to set a new password for their SigNoz account.'}
					</p>
					<div className="reset-link-dialog__link-row">
						<div className="reset-link-dialog__link-text-wrap">
							<span className="reset-link-dialog__link-text">{resetLink}</span>
						</div>
						<Button
							variant="outlined"
							color="secondary"
							size="sm"
							onClick={handleCopyResetLink}
							prefixIcon={
								hasCopiedResetLink ? <Check size={12} /> : <Copy size={12} />
							}
							className="reset-link-dialog__copy-btn"
						>
							{hasCopiedResetLink ? 'Copied!' : 'Copy'}
						</Button>
					</div>
				</div>
			</DialogWrapper>

			<DialogWrapper
				open={showDeleteConfirm}
				onOpenChange={(isOpen): void => {
					if (!isOpen) {
						setShowDeleteConfirm(false);
					}
				}}
				title={deleteDialogTitle}
				width="narrow"
				className="alert-dialog delete-dialog"
				showCloseButton={false}
				disableOutsideClick={false}
			>
				<p className="delete-dialog__body">{deleteDialogBody}</p>

				<DialogFooter className="delete-dialog__footer">
					<Button
						variant="solid"
						color="secondary"
						size="sm"
						onClick={(): void => setShowDeleteConfirm(false)}
					>
						<X size={12} />
						Cancel
					</Button>
					<Button
						variant="solid"
						color="destructive"
						size="sm"
						disabled={isDeleting}
						onClick={handleDelete}
					>
						<Trash2 size={12} />
						{isDeleting ? 'Processing...' : deleteConfirmLabel}
					</Button>
				</DialogFooter>
			</DialogWrapper>
		</>
	);
}

export default EditMemberDrawer;
