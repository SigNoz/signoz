import { useCallback, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import { Form, Modal } from 'antd';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import {
	useCreateAuthDomain,
	useUpdateAuthDomain,
} from 'api/generated/services/authdomains';
import {
	AuthtypesAuthNProviderDTO,
	AuthtypesGettableAuthDomainDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { FeatureKeys } from 'constants/features';
import { defaultTo } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

import AuthnProviderSelector from './AuthnProviderSelector';
import {
	FormValues,
	kindToProvider,
	prepareConfig,
	prepareInitialValues,
	prepareRoleMapping,
} from './CreateEdit.utils';
import ConfigureGoogleAuthAuthnProvider from './Providers/AuthnGoogleAuth';
import ConfigureOIDCAuthnProvider from './Providers/AuthnOIDC';
import ConfigureSAMLAuthnProvider from './Providers/AuthnSAML';

import './CreateEdit.styles.scss';
function configureAuthnProvider(
	authnProvider: string,
	isCreate: boolean,
): JSX.Element {
	switch (authnProvider) {
		case 'saml':
			return <ConfigureSAMLAuthnProvider isCreate={isCreate} />;
		case 'google':
			return <ConfigureGoogleAuthAuthnProvider isCreate={isCreate} />;
		case 'oidc':
			return <ConfigureOIDCAuthnProvider isCreate={isCreate} />;
		default:
			return <ConfigureGoogleAuthAuthnProvider isCreate={isCreate} />;
	}
}

interface CreateOrEditProps {
	isCreate: boolean;
	onClose: () => void;
	record?: AuthtypesGettableAuthDomainDTO;
}

function CreateOrEdit(props: CreateOrEditProps): JSX.Element {
	const { isCreate, record, onClose } = props;
	const [form] = Form.useForm<FormValues>();
	const [authnProvider, setAuthnProvider] = useState<
		AuthtypesAuthNProviderDTO | ''
	>(kindToProvider(record?.config?.kind));

	const { showErrorModal } = useErrorModal();
	const { featureFlags } = useAppContext();

	const handleError = useCallback(
		(error: AxiosError<RenderErrorResponseDTO>): void => {
			try {
				ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
			} catch (apiError) {
				showErrorModal(apiError as APIError);
			}
		},
		[showErrorModal],
	);
	const samlEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.SSO)?.active || false;

	const { mutate: createAuthDomain, isLoading: isCreating } =
		useCreateAuthDomain<AxiosError<RenderErrorResponseDTO>>();

	const { mutate: updateAuthDomain, isLoading: isUpdating } =
		useUpdateAuthDomain<AxiosError<RenderErrorResponseDTO>>();

	const onSubmitHandler = useCallback(async (): Promise<void> => {
		try {
			await form.validateFields();
		} catch {
			return;
		}

		if (authnProvider === '') {
			return;
		}

		const values = form.getFieldsValue(true) as FormValues;
		const name = values.name ?? '';
		const config = prepareConfig(values, authnProvider);
		const roleMapping = prepareRoleMapping(values);

		if (!config) {
			return;
		}

		if (isCreate) {
			createAuthDomain(
				{
					data: {
						name,
						enabled: true,
						config,
						roleMapping,
					},
				},
				{
					onSuccess: () => {
						toast.success('Domain created successfully');
						onClose();
					},
					onError: handleError,
				},
			);
		} else {
			if (!record?.id) {
				return;
			}

			updateAuthDomain(
				{
					pathParams: { id: record.id },
					data: {
						enabled: values.enabled ?? false,
						config,
						roleMapping,
					},
				},
				{
					onSuccess: () => {
						toast.success('Domain updated successfully');
						onClose();
					},
					onError: handleError,
				},
			);
		}
	}, [
		authnProvider,
		createAuthDomain,
		form,
		handleError,
		isCreate,

		onClose,
		record,
		updateAuthDomain,
	]);

	const onBackHandler = useCallback((): void => {
		form.resetFields();
		setAuthnProvider('');
	}, [form]);

	return (
		<Modal
			open
			footer={null}
			onCancel={onClose}
			width={authnProvider ? 980 : undefined}
		>
			<Form
				name="auth-domain"
				initialValues={defaultTo(prepareInitialValues(record), {
					name: '',
					enabled: false,
				})}
				form={form}
				layout="vertical"
			>
				{isCreate && authnProvider === '' && (
					<AuthnProviderSelector
						setAuthnProvider={setAuthnProvider}
						samlEnabled={samlEnabled}
					/>
				)}
				{authnProvider !== '' && (
					<div className="auth-domain-configure">
						{configureAuthnProvider(authnProvider, isCreate)}
						<section className="action-buttons">
							{isCreate && (
								<Button onClick={onBackHandler} variant="solid" color="secondary">
									Back
								</Button>
							)}
							{!isCreate && (
								<Button onClick={onClose} variant="solid" color="secondary">
									Cancel
								</Button>
							)}
							<Button
								onClick={onSubmitHandler}
								variant="solid"
								color="primary"
								loading={isCreating || isUpdating}
							>
								Save Changes
							</Button>
						</section>
					</div>
				)}
			</Form>
		</Modal>
	);
}

CreateOrEdit.defaultProps = {
	record: null,
};

export default CreateOrEdit;
