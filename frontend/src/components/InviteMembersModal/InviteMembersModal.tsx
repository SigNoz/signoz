import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { Style } from '@signozhq/design-tokens';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { ChevronDown, CircleAlert, Plus, Trash2, X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { Select } from 'antd';
import inviteUsers from 'api/v1/invite/bulk/create';
import sendInvite from 'api/v1/invite/create';
import { cloneDeep, debounce } from 'lodash-es';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { ROLES } from 'types/roles';
import { EMAIL_REGEX } from 'utils/app';
import { popupContainer } from 'utils/selectPopupContainer';
import { v4 as uuid } from 'uuid';

import './InviteMembersModal.styles.scss';

interface InviteRow {
	id: string;
	email: string;
	role: ROLES | '';
}

export interface InviteMembersModalProps {
	open: boolean;
	onClose: () => void;
	onComplete?: () => void;
}

const EMPTY_ROW = (): InviteRow => ({ id: uuid(), email: '', role: '' });

const isRowTouched = (row: InviteRow): boolean =>
	row.email.trim() !== '' || Boolean(row.role && row.role.trim() !== '');

function InviteMembersModal({
	open,
	onClose,
	onComplete,
}: InviteMembersModalProps): JSX.Element {
	const { showErrorModal, isErrorModalVisible } = useErrorModal();

	const [rows, setRows] = useState<InviteRow[]>(() => [
		EMPTY_ROW(),
		EMPTY_ROW(),
		EMPTY_ROW(),
	]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [emailValidity, setEmailValidity] = useState<Record<string, boolean>>(
		{},
	);
	const [hasInvalidEmails, setHasInvalidEmails] = useState<boolean>(false);
	const [hasInvalidRoles, setHasInvalidRoles] = useState<boolean>(false);

	const resetAndClose = useCallback((): void => {
		setRows([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]);
		setEmailValidity({});
		setHasInvalidEmails(false);
		setHasInvalidRoles(false);
		onClose();
	}, [onClose]);

	useEffect(() => {
		if (open) {
			setRows([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]);
		}
	}, [open]);

	const getValidationErrorMessage = (): string => {
		if (hasInvalidEmails && hasInvalidRoles) {
			return 'Please enter valid emails and select roles for team members';
		}
		if (hasInvalidEmails) {
			return 'Please enter valid emails for team members';
		}
		return 'Please select roles for team members';
	};

	const validateAllUsers = useCallback((): boolean => {
		let isValid = true;
		let hasEmailErrors = false;
		let hasRoleErrors = false;

		const updatedEmailValidity: Record<string, boolean> = {};

		const touchedRows = rows.filter(isRowTouched);

		touchedRows.forEach((row) => {
			const emailValid = EMAIL_REGEX.test(row.email);
			const roleValid = Boolean(row.role && row.role.trim() !== '');

			if (!emailValid || !row.email) {
				isValid = false;
				hasEmailErrors = true;
			}
			if (!roleValid) {
				isValid = false;
				hasRoleErrors = true;
			}

			if (row.id) {
				updatedEmailValidity[row.id] = emailValid;
			}
		});

		setEmailValidity(updatedEmailValidity);
		setHasInvalidEmails(hasEmailErrors);
		setHasInvalidRoles(hasRoleErrors);

		return isValid;
	}, [rows]);

	const debouncedValidateEmail = useMemo(
		() =>
			debounce((email: string, rowId: string) => {
				const isValid = EMAIL_REGEX.test(email);
				setEmailValidity((prev) => ({ ...prev, [rowId]: isValid }));
			}, 500),
		[],
	);

	useEffect(() => {
		if (!open) {
			debouncedValidateEmail.cancel();
		}
		return (): void => {
			debouncedValidateEmail.cancel();
		};
	}, [open, debouncedValidateEmail]);

	const updateEmail = (id: string, email: string): void => {
		const updatedRows = cloneDeep(rows);
		const rowToUpdate = updatedRows.find((r) => r.id === id);
		if (rowToUpdate) {
			rowToUpdate.email = email;
			setRows(updatedRows);

			if (hasInvalidEmails) {
				setHasInvalidEmails(false);
			}
			if (emailValidity[id] === false) {
				setEmailValidity((prev) => ({ ...prev, [id]: true }));
			}

			debouncedValidateEmail(email, id);
		}
	};

	const updateRole = (id: string, role: ROLES): void => {
		const updatedRows = cloneDeep(rows);
		const rowToUpdate = updatedRows.find((r) => r.id === id);
		if (rowToUpdate) {
			rowToUpdate.role = role;
			setRows(updatedRows);

			if (hasInvalidRoles) {
				setHasInvalidRoles(false);
			}
		}
	};

	const addRow = (): void => {
		setRows((prev) => [...prev, EMPTY_ROW()]);
	};

	const removeRow = (id: string): void => {
		setRows((prev) => prev.filter((r) => r.id !== id));
	};

	const handleSubmit = useCallback(async (): Promise<void> => {
		if (!validateAllUsers()) {
			return;
		}

		const touchedRows = rows.filter(isRowTouched);
		if (touchedRows.length === 0) {
			return;
		}

		setIsSubmitting(true);
		try {
			if (touchedRows.length === 1) {
				const row = touchedRows[0];
				await sendInvite({
					email: row.email.trim(),
					name: '',
					role: row.role as ROLES,
					frontendBaseUrl: window.location.origin,
				});
			} else {
				await inviteUsers({
					invites: touchedRows.map((row) => ({
						email: row.email.trim(),
						name: '',
						role: row.role,
						frontendBaseUrl: window.location.origin,
					})),
				});
			}
			toast.success('Invites sent successfully', {
				richColors: true,
				position: 'top-right',
			});
			resetAndClose();
			onComplete?.();
		} catch (err) {
			showErrorModal(err as APIError);
		} finally {
			setIsSubmitting(false);
		}
	}, [validateAllUsers, rows, resetAndClose, onComplete, showErrorModal]);

	const touchedRows = rows.filter(isRowTouched);
	const isSubmitDisabled = isSubmitting || touchedRows.length === 0;

	return (
		<DialogWrapper
			title="Invite Team Members"
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					resetAndClose();
				}
			}}
			showCloseButton
			width="wide"
			className="invite-members-modal"
			disableOutsideClick={isErrorModalVisible}
		>
			<div className="invite-members-modal__content">
				<div className="invite-members-modal__table">
					<div className="invite-members-modal__table-header">
						<div className="table-header-cell email-header">Email address</div>
						<div className="table-header-cell role-header">Roles</div>
						<div className="table-header-cell action-header" />
					</div>
					<div className="invite-members-modal__container">
						{rows.map(
							(row): JSX.Element => (
								<div key={row.id} className="team-member-row">
									<div className="team-member-cell email-cell">
										<Input
											type="email"
											placeholder="john@signoz.io"
											value={row.email}
											onChange={(e): void => updateEmail(row.id, e.target.value)}
											className="team-member-email-input"
											name={`invite-email-${row.id}`}
											autoComplete="email"
										/>
										{emailValidity[row.id] === false && row.email.trim() !== '' && (
											<span className="email-error-message">Invalid email address</span>
										)}
									</div>
									<div className="team-member-cell role-cell">
										<Select
											value={row.role || undefined}
											onChange={(role): void => updateRole(row.id, role as ROLES)}
											className="team-member-role-select"
											placeholder="Select roles"
											suffixIcon={<ChevronDown size={14} />}
											getPopupContainer={popupContainer}
										>
											<Select.Option value="VIEWER">Viewer</Select.Option>
											<Select.Option value="EDITOR">Editor</Select.Option>
											<Select.Option value="ADMIN">Admin</Select.Option>
										</Select>
									</div>
									<div className="team-member-cell action-cell">
										{rows.length > 1 && (
											<Button
												variant="ghost"
												color="destructive"
												className="remove-team-member-button"
												onClick={(): void => removeRow(row.id)}
												aria-label="Remove row"
											>
												<Trash2 size={12} />
											</Button>
										)}
									</div>
								</div>
							),
						)}
					</div>
				</div>

				{(hasInvalidEmails || hasInvalidRoles) && (
					<Callout
						type="error"
						size="small"
						showIcon
						icon={<CircleAlert size={12} />}
						className="invite-team-members-error-callout"
						description={getValidationErrorMessage()}
					/>
				)}
			</div>

			<DialogFooter className="invite-members-modal__footer">
				<Button
					variant="dashed"
					color="secondary"
					size="sm"
					className="add-another-member-button"
					prefixIcon={<Plus size={12} color={Style.L1_FOREGROUND} />}
					onClick={addRow}
				>
					Add another
				</Button>

				<div className="invite-members-modal__footer-right">
					<Button
						type="button"
						variant="solid"
						color="secondary"
						size="sm"
						onClick={resetAndClose}
					>
						<X size={12} />
						Cancel
					</Button>

					<Button
						variant="solid"
						color="primary"
						size="sm"
						onClick={handleSubmit}
						disabled={isSubmitDisabled}
						loading={isSubmitting}
					>
						{isSubmitting ? 'Inviting...' : 'Invite Team Members'}
					</Button>
				</div>
			</DialogFooter>
		</DialogWrapper>
	);
}

export default InviteMembersModal;
