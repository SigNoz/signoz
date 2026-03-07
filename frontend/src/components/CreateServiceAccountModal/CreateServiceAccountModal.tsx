import { useCallback, useState } from 'react';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { ChevronDown, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { Form, Input, Select } from 'antd';
import { useCreateServiceAccount } from 'api/generated/services/serviceaccount';

import './CreateServiceAccountModal.styles.scss';

interface CreateServiceAccountModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

interface FormValues {
	name: string;
	email?: string;
	roles: string[];
}

function CreateServiceAccountModal({
	open,
	onClose,
	onSuccess,
}: CreateServiceAccountModalProps): JSX.Element {
	const [form] = Form.useForm<FormValues>();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { mutateAsync: createServiceAccount } = useCreateServiceAccount();

	const handleClose = useCallback((): void => {
		form.resetFields();
		onClose();
	}, [form, onClose]);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			const values = await form.validateFields();
			setIsSubmitting(true);
			await createServiceAccount({
				data: {
					name: values.name.trim(),
					email: values.email?.trim() ?? '',
					roles: values.roles ?? [],
				},
			});
			toast.success('Service account created successfully', { richColors: true });
			form.resetFields();
			onSuccess();
			onClose();
		} catch (err: unknown) {
			// If it's a form validation error (no message property typical of AntD), skip
			if (err && typeof err === 'object' && 'errorFields' in err) {
				return;
			}
			const errorMessage =
				err instanceof Error ? err.message : 'An error occurred';
			toast.error(`Failed to create service account: ${errorMessage}`, {
				richColors: true,
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [form, createServiceAccount, onSuccess, onClose]);

	return (
		<DialogWrapper
			title="New Service Account"
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleClose();
				}
			}}
			showCloseButton
			width="narrow"
			className="create-sa-modal"
			disableOutsideClick={false}
		>
			<div className="create-sa-modal__content">
				<Form form={form} layout="vertical" className="create-sa-form">
					<Form.Item
						name="name"
						label="Name"
						rules={[{ required: true, message: 'Name is required' }]}
						className="create-sa-form__item"
					>
						<Input placeholder="Enter a name" className="create-sa-form__input" />
					</Form.Item>

					<Form.Item
						name="email"
						label="Email Address"
						className="create-sa-form__item"
					>
						<Input
							type="email"
							placeholder="email@example.com"
							className="create-sa-form__input"
						/>
					</Form.Item>
					<p className="create-sa-form__helper">
						Used only for notifications about this service account. It is not used for
						authentication.
					</p>

					<Form.Item name="roles" label="Roles" className="create-sa-form__item">
						<Select
							mode="multiple"
							placeholder="Select roles"
							suffixIcon={<ChevronDown size={14} />}
							className="create-sa-form__select"
							getPopupContainer={(triggerNode): HTMLElement =>
								(triggerNode?.closest('.create-sa-modal') as HTMLElement) ||
								document.body
							}
						>
							<Select.Option value="VIEWER">Viewer</Select.Option>
							<Select.Option value="EDITOR">Editor</Select.Option>
							<Select.Option value="ADMIN">Admin</Select.Option>
						</Select>
					</Form.Item>
				</Form>
			</div>

			<DialogFooter className="create-sa-modal__footer">
				<Button
					type="button"
					variant="solid"
					color="secondary"
					size="sm"
					onClick={handleClose}
				>
					<X size={12} />
					Cancel
				</Button>

				<Button
					variant="solid"
					color="primary"
					size="sm"
					onClick={handleSubmit}
					disabled={isSubmitting}
				>
					{isSubmitting ? 'Creating...' : 'Create Service Account'}
				</Button>
			</DialogFooter>
		</DialogWrapper>
	);
}

export default CreateServiceAccountModal;
