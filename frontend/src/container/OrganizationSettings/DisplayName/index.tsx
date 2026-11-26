import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@signozhq/ui/input';
import { toast } from '@signozhq/ui/toast';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	useGetMyOrganization,
	useUpdateMyOrganization,
} from 'api/generated/services/orgs';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import {
	buildOrganizationReadPermission,
	buildOrganizationUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/organization.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';
import { IUser } from 'providers/App/types';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { requireErrorMessage } from 'utils/form/requireErrorMessage';

import { getSubmitBlockedReason } from './utils';

import './DisplayName.styles.scss';
import { AuthZGuardContent } from '@/lib/authz/components/AuthZGuard/AuthZGuardContent';

function DisplayName({ index, id: orgId }: DisplayNameProps): JSX.Element {
	const { t } = useTranslation(['organizationsettings', 'common']);
	const { showErrorModal } = useErrorModal();
	const { org, updateOrg } = useAppContext();
	const currentOrg = (org || [])[index];
	const readPermission = buildOrganizationReadPermission(orgId);
	const updatePermission = buildOrganizationUpdatePermission(orgId);
	const { permissions: authzPermissions } = useAuthZ([
		readPermission,
		updatePermission,
	]);

	const canReadOrg = authzPermissions?.[readPermission]?.isGranted ?? false;
	const canUpdateOrg = authzPermissions?.[updatePermission]?.isGranted ?? false;

	const { data: orgData } = useGetMyOrganization({
		query: {
			enabled: canReadOrg && !currentOrg?.displayName,
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
					updateOrg(orgId, data?.displayName ?? '');
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

	const submitBlockedReason = getSubmitBlockedReason({
		canUpdate: canUpdateOrg,
		name: orgName,
		savedName: displayName,
	});

	return (
		<form
			className="display-name-form"
			data-testid="org-display-name-form"
			onSubmit={handleSubmit(onSubmit)}
			autoComplete="off"
		>
			<div className="form-field">
				<label htmlFor="displayName">Display name</label>
				<AuthZGuardContent checks={[readPermission]}>
					<Controller
						name="displayName"
						control={control}
						rules={{ required: requireErrorMessage('Display name') }}
						render={({ field, fieldState }): JSX.Element => (
							<>
								<AuthZTooltip
									triggerClassName="org-input-disabled-tooltip-class"
									checks={[updatePermission]}
								>
									<Input
										{...field}
										id="displayName"
										testId="org-display-name-input"
										size="lg"
										placeholder={t('signoz')}
										status={fieldState.error ? 'danger' : undefined}
									/>
								</AuthZTooltip>
								{fieldState.error && (
									<div className="field-error">{fieldState.error.message}</div>
								)}
							</>
						)}
					/>
				</AuthZGuardContent>
			</div>
			{canReadOrg && (
				<div>
					<AuthZButton
						size="md"
						variant="solid"
						color="primary"
						type="submit"
						loading={isLoading}
						disabledTooltip={submitBlockedReason}
						testId="org-display-name-submit"
						checks={[updatePermission]}
					>
						Submit
					</AuthZButton>
				</div>
			)}
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
