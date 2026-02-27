import { useCallback, useState } from 'react';
import { Button } from '@signozhq/button';
import { Plus, Trash2, X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { Form, Modal, Select } from 'antd';
import sendInvite from 'api/v1/invite/create';
import { useNotifications } from 'hooks/useNotifications';
import { ROLES } from 'types/roles';

import './InviteMemberModal.styles.scss';

interface InviteRow {
	email: string;
	role: ROLES;
}

interface InviteMemberModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const ROLE_OPTIONS: { label: string; value: ROLES }[] = [
	{ label: 'Admin', value: 'ADMIN' },
	{ label: 'Editor', value: 'EDITOR' },
	{ label: 'Viewer', value: 'VIEWER' },
];

function InviteMemberModal({
	open,
	onClose,
	onSuccess,
}: InviteMemberModalProps): JSX.Element {
	const [form] = Form.useForm<{ members: InviteRow[] }>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { notifications } = useNotifications();

	const handleClose = useCallback((): void => {
		form.resetFields();
		onClose();
	}, [form, onClose]);

	const handleSubmit = useCallback(async (): Promise<void> => {
		let values: { members: InviteRow[] };
		try {
			values = await form.validateFields();
		} catch {
			return;
		}

		setIsSubmitting(true);
		let hasError = false;

		await Promise.all(
			values.members.map(async (member) => {
				try {
					await sendInvite({
						email: member.email,
						name: '',
						role: member.role,
						frontendBaseUrl: window.location.origin,
					});
				} catch (err: unknown) {
					hasError = true;
					const apiErr = err as {
						getErrorCode?: () => string;
						getErrorMessage?: () => string;
						response?: { status: number };
					};
					if (apiErr?.response?.status === 409) {
						notifications.error({
							message: `${member.email} is already a member`,
						});
					} else {
						notifications.error({
							message: `Failed to invite ${member.email}`,
							description: apiErr?.getErrorMessage?.() ?? 'An error occurred',
						});
					}
				}
			}),
		);

		setIsSubmitting(false);

		if (!hasError) {
			notifications.success({ message: 'Invites sent successfully' });
			form.resetFields();
			onSuccess();
			onClose();
		} else {
			onSuccess();
		}
	}, [form, notifications, onClose, onSuccess]);

	return (
		<Modal
			open={open}
			onCancel={handleClose}
			width={560}
			centered
			destroyOnClose
			footer={null}
			closable={false}
			className="invite-member-modal"
		>
			{/* Header */}
			<div className="invite-member-modal__header">
				<span className="invite-member-modal__title">Invite Team Members</span>
				<button
					type="button"
					className="invite-member-modal__close"
					onClick={handleClose}
					aria-label="Close"
				>
					<X size={14} />
				</button>
			</div>

			{/* Content */}
			<Form
				form={form}
				initialValues={{ members: [{ email: '', role: 'VIEWER' as ROLES }] }}
				className="invite-member-modal__form"
			>
				<Form.List name="members">
					{(fields, { add, remove }): JSX.Element => (
						<>
							{fields.map(({ key, name }, index) => (
								<div key={key} className="invite-member-modal__row">
									<div className="invite-member-modal__fields">
										<div className="invite-member-modal__field invite-member-modal__field--email">
											{index === 0 && (
												<label
													htmlFor={`member-${name}-email`}
													className="invite-member-modal__label"
												>
													Email address
												</label>
											)}
											<Form.Item
												name={[name, 'email']}
												rules={[
													{ required: true, message: '' },
													{ type: 'email', message: '' },
												]}
												noStyle
											>
												<Input
													id={`member-${name}-email`}
													placeholder="john@example.com"
													className="invite-member-modal__input"
												/>
											</Form.Item>
										</div>
										<div className="invite-member-modal__field invite-member-modal__field--role">
											{index === 0 && (
												<label
													htmlFor={`member-${name}-role`}
													className="invite-member-modal__label"
												>
													Roles
												</label>
											)}
											<Form.Item
												name={[name, 'role']}
												rules={[{ required: true, message: '' }]}
												noStyle
											>
												<Select
													id={`member-${name}-role`}
													placeholder="Select role"
													className="invite-member-modal__select"
													options={ROLE_OPTIONS}
													popupClassName="invite-member-modal__select-dropdown"
												/>
											</Form.Item>
										</div>
									</div>
									<div
										className={`invite-member-modal__delete-wrap ${
											index === 0 ? 'invite-member-modal__delete-wrap--with-label' : ''
										}`}
									>
										<Button
											variant="ghost"
											size="sm"
											onClick={(): void => remove(name)}
											disabled={fields.length === 1}
											aria-label="Remove"
										>
											<Trash2 size={14} />
										</Button>
									</div>
								</div>
							))}

							{/* Footer */}
							<div className="invite-member-modal__footer">
								<Button
									variant="outlined"
									size="sm"
									onClick={(): void => add({ email: '', role: 'VIEWER' as ROLES })}
								>
									<Plus size={12} />
									Add another
								</Button>
								<div className="invite-member-modal__footer-actions">
									<button
										type="button"
										className="invite-member-modal__cancel"
										onClick={handleClose}
									>
										<X size={12} />
										Cancel
									</button>
									<Button
										variant="solid"
										size="sm"
										onClick={handleSubmit}
										disabled={isSubmitting}
									>
										{isSubmitting ? 'Inviting...' : 'Invite Team Members'}
									</Button>
								</div>
							</div>
						</>
					)}
				</Form.List>
			</Form>
		</Modal>
	);
}

export default InviteMemberModal;
