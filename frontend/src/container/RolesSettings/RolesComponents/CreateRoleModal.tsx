import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { Form, Input as AntInput, Modal } from 'antd';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import {
	invalidateListRoles,
	useCreateRole,
} from 'api/generated/services/role';
import type { RoletypesPostableRoleDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

import '../RolesSettings.styles.scss';

interface CreateRoleModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface CreateRoleFormValues {
	name: string;
	description?: string;
}

function CreateRoleModal({
	isOpen,
	onClose,
}: CreateRoleModalProps): JSX.Element {
	const [form] = Form.useForm<CreateRoleFormValues>();
	const queryClient = useQueryClient();

	const { showErrorModal } = useErrorModal();

	const { mutate: createRole, isLoading } = useCreateRole({
		mutation: {
			onSuccess: async (): Promise<void> => {
				await invalidateListRoles(queryClient);
				toast.success('Role created successfully');
				form.resetFields();
				onClose();
			},
			onError: (error) => {
				try {
					ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
				} catch (apiError) {
					showErrorModal(apiError as APIError);
				}
			},
		},
	});

	const onSubmit = useCallback(async (): Promise<void> => {
		try {
			const values = await form.validateFields();
			const data: RoletypesPostableRoleDTO = {
				name: values.name,
				...(values.description ? { description: values.description } : {}),
			};
			createRole({ data });
		} catch {
			// form validation failed; antd handles inline error display
		}
	}, [form, createRole]);

	const onCancel = useCallback((): void => {
		form.resetFields();
		onClose();
	}, [form, onClose]);

	return (
		<Modal
			open={isOpen}
			onCancel={onCancel}
			title="Create a New Role"
			footer={[
				<Button
					key="cancel"
					variant="solid"
					color="secondary"
					onClick={onCancel}
					size="sm"
				>
					<X size={14} />
					Cancel
				</Button>,
				<Button
					key="submit"
					variant="solid"
					color="primary"
					onClick={onSubmit}
					loading={isLoading}
					size="sm"
				>
					Create Role
				</Button>,
			]}
			destroyOnClose
			className="create-role-modal"
			width={530}
		>
			<Form form={form} layout="vertical" className="create-role-form">
				<Form.Item
					name="name"
					label="Name"
					rules={[{ required: true, message: 'Role name is required' }]}
				>
					<Input placeholder="Enter role name e.g. : Service Owner" />
				</Form.Item>
				<Form.Item name="description" label="Description">
					<AntInput.TextArea placeholder="A helpful description of the role" />
				</Form.Item>
			</Form>
		</Modal>
	);
}

export default CreateRoleModal;
