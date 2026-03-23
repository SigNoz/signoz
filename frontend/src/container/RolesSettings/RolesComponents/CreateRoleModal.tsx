import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from 'react-query';
import { generatePath, useHistory } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { X } from '@signozhq/icons';
import { Input, inputVariants } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { Form, Modal } from 'antd';
import {
	invalidateGetRole,
	invalidateListRoles,
	useCreateRole,
	usePatchRole,
} from 'api/generated/services/role';
import {
	AuthtypesPostableRoleDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import ROUTES from 'constants/routes';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { handleApiError } from 'utils/errorUtils';

import '../RolesSettings.styles.scss';

export interface CreateRoleModalInitialData {
	id: string;
	name: string;
	description?: string;
}

interface CreateRoleModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: CreateRoleModalInitialData;
}

interface CreateRoleFormValues {
	name: string;
	description?: string;
}

function CreateRoleModal({
	isOpen,
	onClose,
	initialData,
}: CreateRoleModalProps): JSX.Element {
	const [form] = Form.useForm<CreateRoleFormValues>();
	const queryClient = useQueryClient();
	const history = useHistory();
	const { showErrorModal } = useErrorModal();

	const isEditMode = !!initialData?.id;
	const prevIsOpen = useRef(isOpen);

	useEffect(() => {
		if (isOpen && !prevIsOpen.current) {
			if (isEditMode && initialData) {
				form.setFieldsValue({
					name: initialData.name,
					description: initialData.description || '',
				});
			} else {
				form.resetFields();
			}
		}
		prevIsOpen.current = isOpen;
	}, [isOpen, isEditMode, initialData, form]);

	const handleSuccess = async (
		message: string,
		redirectPath?: string,
	): Promise<void> => {
		await invalidateListRoles(queryClient);
		if (isEditMode && initialData?.id) {
			await invalidateGetRole(queryClient, { id: initialData.id });
		}
		toast.success(message);
		form.resetFields();
		onClose();
		if (redirectPath) {
			history.push(redirectPath);
		}
	};

	const handleError = (error: ErrorType<RenderErrorResponseDTO>): void => {
		handleApiError(error, showErrorModal);
	};

	const { mutate: createRole, isLoading: isCreating } = useCreateRole({
		mutation: {
			onSuccess: (res) =>
				handleSuccess(
					'Role created successfully',
					generatePath(ROUTES.ROLE_DETAILS, { roleId: res.data.id }),
				),
			onError: handleError,
		},
	});

	const { mutate: patchRole, isLoading: isPatching } = usePatchRole({
		mutation: {
			onSuccess: () => handleSuccess('Role updated successfully'),
			onError: handleError,
		},
	});

	const onSubmit = useCallback(async (): Promise<void> => {
		try {
			const values = await form.validateFields();
			if (isEditMode && initialData?.id) {
				patchRole({
					pathParams: { id: initialData.id },
					data: { description: values.description || '' },
				});
			} else {
				const data: AuthtypesPostableRoleDTO = {
					name: values.name,
					...(values.description ? { description: values.description } : {}),
				};
				createRole({ data });
			}
		} catch {
			// form validation failed; antd handles inline error display
		}
	}, [form, createRole, patchRole, isEditMode, initialData]);

	const onCancel = useCallback((): void => {
		form.resetFields();
		onClose();
	}, [form, onClose]);

	const isLoading = isCreating || isPatching;

	return (
		<Modal
			open={isOpen}
			onCancel={onCancel}
			title={isEditMode ? 'Edit Role Details' : 'Create a New Role'}
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
					{isEditMode ? 'Save Changes' : 'Create Role'}
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
					<Input
						disabled={isEditMode}
						placeholder="Enter role name e.g. : Service Owner"
					/>
				</Form.Item>
				<Form.Item name="description" label="Description">
					<textarea
						className={inputVariants()}
						placeholder="A helpful description of the role"
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
}

export default CreateRoleModal;
