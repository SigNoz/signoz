import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from '@signozhq/ui/sonner';
import { Button, Input } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	useGetMyOrganization,
	useUpdateMyOrganization,
} from 'api/generated/services/orgs';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useAppContext } from 'providers/App/App';
import { IUser } from 'providers/App/types';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { USER_ROLES } from 'types/roles';
import { requireErrorMessage } from 'utils/form/requireErrorMessage';

import './DisplayName.styles.scss';

function DisplayName({ index, id: orgId }: DisplayNameProps): JSX.Element {
	const { t } = useTranslation(['organizationsettings', 'common']);
	const { showErrorModal } = useErrorModal();
	const { org, updateOrg, user } = useAppContext();
	const currentOrg = (org || [])[index];
	const isAdmin = user.role === USER_ROLES.ADMIN;

	const { data: orgData } = useGetMyOrganization({
		query: {
			enabled: isAdmin && !currentOrg?.displayName,
		},
	});

	const displayName =
		currentOrg?.displayName ?? orgData?.data?.displayName ?? '';

	const { control, handleSubmit, watch, getValues, setValue } =
		useForm<FormValues>({
			defaultValues: { displayName },
		});

	const orgName = watch('displayName');

	useEffect(() => {
		if (displayName && !getValues('displayName')) {
			setValue('displayName', displayName);
		}
	}, [displayName, getValues, setValue]);

	const { mutateAsync: updateMyOrganization, isLoading } =
		useUpdateMyOrganization({
			mutation: {
				onSuccess: (_, { data }) => {
					toast.success(t('success', { ns: 'common' }), {
						position: 'top-right',
					});
					updateOrg(orgId, data.displayName ?? '');
				},
				onError: (error) => {
					showErrorModal(
						convertToApiError(
							error as AxiosError<RenderErrorResponseDTO>,
						) as APIError,
					);
				},
			},
		});

	const onSubmit = async (values: FormValues): Promise<void> => {
		const { displayName: name } = values;
		await updateMyOrganization({ data: { id: orgId, displayName: name } });
	};

	if (!org) {
		return <div />;
	}

	const isDisabled = isLoading || orgName === displayName || !orgName;

	return (
		<form
			className="display-name-form"
			onSubmit={handleSubmit(onSubmit)}
			autoComplete="off"
		>
			<div className="form-field">
				<label htmlFor="displayName">Display name</label>
				<Controller
					name="displayName"
					control={control}
					rules={{ required: requireErrorMessage('Display name') }}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<Input
								{...field}
								id="displayName"
								size="large"
								placeholder={t('signoz')}
								status={fieldState.error ? 'error' : ''}
							/>
							{fieldState.error && (
								<div className="field-error">{fieldState.error.message}</div>
							)}
						</>
					)}
				/>
			</div>
			<div>
				<Button
					loading={isLoading}
					disabled={isDisabled}
					type="primary"
					htmlType="submit"
				>
					Submit
				</Button>
			</div>
		</form>
	);
}

interface DisplayNameProps {
	index: number;
	id: IUser['id'];
}

interface FormValues {
	displayName: string;
}

export default DisplayName;
