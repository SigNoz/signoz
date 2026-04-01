import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { Button, DialogFooter, DialogWrapper, Input } from '@signozhq/ui';
import { X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	invalidateListServiceAccounts,
	useCreateServiceAccount,
} from 'api/generated/services/serviceaccount';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import { parseAsBoolean, useQueryState } from 'nuqs';

import './CreateServiceAccountModal.styles.scss';

interface FormValues {
	name: string;
}

function CreateServiceAccountModal(): JSX.Element {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useQueryState(
		SA_QUERY_PARAMS.CREATE_SA,
		parseAsBoolean.withDefault(false),
	);

	const {
		control,
		handleSubmit,
		reset,
		formState: { isValid, errors },
	} = useForm<FormValues>({
		mode: 'onChange',
		defaultValues: {
			name: '',
		},
	});

	const {
		mutate: createServiceAccount,
		isLoading: isSubmitting,
	} = useCreateServiceAccount({
		mutation: {
			onSuccess: async () => {
				toast.success('Service account created successfully', {
					richColors: true,
				});
				reset();
				await setIsOpen(null);
				await invalidateListServiceAccounts(queryClient);
			},
			onError: (err) => {
				const errMessage =
					convertToApiError(
						err as AxiosError<RenderErrorResponseDTO, unknown> | null,
					)?.getErrorMessage() || 'An error occurred';
				toast.error(`Failed to create service account: ${errMessage}`, {
					richColors: true,
				});
			},
		},
	});

	function handleClose(): void {
		reset();
		setIsOpen(null);
	}

	function handleCreate(values: FormValues): void {
		createServiceAccount({
			data: {
				name: values.name.trim(),
			},
		});
	}

	return (
		<DialogWrapper
			title="New Service Account"
			open={isOpen}
			onOpenChange={(open): void => {
				if (!open) {
					handleClose();
				}
			}}
			showCloseButton
			width="narrow"
			className="create-sa-modal"
			disableOutsideClick={false}
			footer={
				<DialogFooter className="create-sa-modal__footer">
					<Button
						type="button"
						variant="solid"
						color="secondary"
						size="sm"
						onClick={handleClose}
						prefix={<X size={12} />}
					>
						Cancel
					</Button>

					<Button
						asChild
						variant="solid"
						color="primary"
						size="sm"
						loading={isSubmitting}
						disabled={!isValid}
					>
						<button type="submit" form="create-sa-form">
							Create Service Account
						</button>
					</Button>
				</DialogFooter>
			}
		>
			<div className="create-sa-modal__content">
				<form
					id="create-sa-form"
					className="create-sa-form"
					onSubmit={handleSubmit(handleCreate)}
				>
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
				</form>
			</div>
		</DialogWrapper>
	);
}

export default CreateServiceAccountModal;
