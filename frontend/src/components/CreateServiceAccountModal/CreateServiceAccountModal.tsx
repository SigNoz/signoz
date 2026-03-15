import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useCreateServiceAccount } from 'api/generated/services/serviceaccount';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import RolesSelect, { useRoles } from 'components/RolesSelect';
import { EMAIL_REGEX } from 'utils/app';

import './CreateServiceAccountModal.styles.scss';

interface CreateServiceAccountModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

interface FormValues {
	name: string;
	email: string;
	roles: string[];
}

function CreateServiceAccountModal({
	open,
	onClose,
	onSuccess,
}: CreateServiceAccountModalProps): JSX.Element {
	const {
		control,
		handleSubmit,
		reset,
		formState: { isValid, errors },
	} = useForm<FormValues>({
		mode: 'onChange',
		defaultValues: {
			name: '',
			email: '',
			roles: [],
		},
	});

	const [isSubmitting, setIsSubmitting] = useState(false);

	const { mutateAsync: createServiceAccount } = useCreateServiceAccount();
	const {
		roles,
		isLoading: rolesLoading,
		isError: rolesError,
		error: rolesErrorObj,
		refetch: refetchRoles,
	} = useRoles();

	function handleClose(): void {
		reset();
		onClose();
	}

	async function onSubmit(values: FormValues): Promise<void> {
		setIsSubmitting(true);
		try {
			await createServiceAccount({
				data: {
					name: values.name.trim(),
					email: values.email.trim(),
					roles: values.roles,
				},
			});
			toast.success('Service account created successfully', { richColors: true });
			reset();
			onSuccess();
			onClose();
		} catch (err: unknown) {
			const errMessage =
				convertToApiError(
					err as AxiosError<RenderErrorResponseDTO, unknown> | null,
				)?.getErrorMessage() || 'An error occurred';
			toast.error(`Failed to create service account: ${errMessage}`, {
				richColors: true,
			});
		} finally {
			setIsSubmitting(false);
		}
	}

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
				<form className="create-sa-form">
					<div className="create-sa-form__item">
						<label htmlFor="sa-name">Name</label>
						<Controller
							name="name"
							control={control}
							rules={{ required: 'Name is required' }}
							render={({ field }): JSX.Element => (
								<Input
									id="sa-name"
									placeholder="Enter a name"
									className="create-sa-form__input"
									value={field.value}
									onChange={field.onChange}
									onBlur={field.onBlur}
								/>
							)}
						/>
						{errors.name && (
							<p className="create-sa-form__error">{errors.name.message}</p>
						)}
					</div>

					<div className="create-sa-form__item">
						<label htmlFor="sa-email">Email Address</label>
						<Controller
							name="email"
							control={control}
							rules={{
								required: 'Email Address is required',
								pattern: {
									value: EMAIL_REGEX,
									message: 'Please enter a valid email address',
								},
							}}
							render={({ field }): JSX.Element => (
								<Input
									id="sa-email"
									type="email"
									placeholder="email@example.com"
									className="create-sa-form__input"
									value={field.value}
									onChange={field.onChange}
									onBlur={field.onBlur}
								/>
							)}
						/>
						{errors.email && (
							<p className="create-sa-form__error">{errors.email.message}</p>
						)}
					</div>
					<p className="create-sa-form__helper">
						Used only for notifications about this service account. It is not used for
						authentication.
					</p>

					<div className="create-sa-form__item">
						<label htmlFor="sa-roles">Roles</label>
						<Controller
							name="roles"
							control={control}
							rules={{
								validate: (value): string | true =>
									value.length > 0 || 'At least one role is required',
							}}
							render={({ field }): JSX.Element => (
								<RolesSelect
									id="sa-roles"
									mode="multiple"
									roles={roles}
									loading={rolesLoading}
									isError={rolesError}
									error={rolesErrorObj}
									onRefetch={refetchRoles}
									placeholder="Select roles"
									value={field.value}
									onChange={field.onChange}
									getPopupContainer={(triggerNode): HTMLElement =>
										(triggerNode?.closest('.create-sa-modal') as HTMLElement) ||
										document.body
									}
								/>
							)}
						/>
						{errors.roles && (
							<p className="create-sa-form__error">{errors.roles.message}</p>
						)}
					</div>
				</form>
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
					onClick={handleSubmit(onSubmit)}
					loading={isSubmitting}
					disabled={!isValid}
				>
					Create Service Account
				</Button>
			</DialogFooter>
		</DialogWrapper>
	);
}

export default CreateServiceAccountModal;
