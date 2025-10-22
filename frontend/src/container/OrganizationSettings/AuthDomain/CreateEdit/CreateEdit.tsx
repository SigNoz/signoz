import './CreateEdit.styles.scss';

import { Button, Form, Modal } from 'antd';
import put from 'api/v1/domains/id/put';
import post from 'api/v1/domains/post';
import { FeatureKeys } from 'constants/features';
import { defaultTo } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useState } from 'react';
import APIError from 'types/api/error';
import { GettableAuthDomain } from 'types/api/v1/domains/list';
import { PostableAuthDomain } from 'types/api/v1/domains/post';

import AuthnProviderSelector from './AuthnProviderSelector';
import ConfigureGoogleAuthAuthnProvider from './Providers/AuthnGoogleAuth';
import ConfigureOIDCAuthnProvider from './Providers/AuthnOIDC';
import ConfigureSAMLAuthnProvider from './Providers/AuthnSAML';

interface CreateOrEditProps {
	isCreate: boolean;
	onClose: () => void;
	record?: GettableAuthDomain;
}

function configureAuthnProvider(
	authnProvider: string,
	isCreate: boolean,
): JSX.Element {
	switch (authnProvider) {
		case 'saml':
			return <ConfigureSAMLAuthnProvider isCreate={isCreate} />;
		case 'google_auth':
			return <ConfigureGoogleAuthAuthnProvider isCreate={isCreate} />;
		case 'oidc':
			return <ConfigureOIDCAuthnProvider isCreate={isCreate} />;
		default:
			return <ConfigureGoogleAuthAuthnProvider isCreate={isCreate} />;
	}
}

function CreateOrEdit(props: CreateOrEditProps): JSX.Element {
	const { isCreate, record, onClose } = props;
	const [form] = Form.useForm<PostableAuthDomain>();
	const [authnProvider, setAuthnProvider] = useState<string>(
		record?.ssoType || '',
	);

	const { showErrorModal } = useErrorModal();
	const { featureFlags } = useAppContext();
	const samlEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.SSO)?.active || false;

	const onSubmitHandler = async (): Promise<void> => {
		const name = form.getFieldValue('name');
		const googleAuthConfig = form.getFieldValue('googleAuthConfig');
		const samlConfig = form.getFieldValue('samlConfig');
		const oidcConfig = form.getFieldValue('oidcConfig');

		try {
			if (isCreate) {
				await post({
					name,
					config: {
						ssoEnabled: true,
						ssoType: authnProvider,
						googleAuthConfig,
						samlConfig,
						oidcConfig,
					},
				});
			} else {
				await put({
					id: record?.id || '',
					config: {
						ssoEnabled: form.getFieldValue('ssoEnabled'),
						ssoType: authnProvider,
						googleAuthConfig,
						samlConfig,
						oidcConfig,
					},
				});
			}

			onClose();
		} catch (error) {
			showErrorModal(error as APIError);
		}
	};

	const onBackHandler = (): void => {
		setAuthnProvider('');
	};

	return (
		<Modal open footer={null} onCancel={onClose}>
			<Form
				name="auth-domain"
				initialValues={defaultTo(record, {
					name: '',
					ssoEnabled: false,
					ssoType: '',
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
							{isCreate && <Button onClick={onBackHandler}>Back</Button>}
							{!isCreate && <Button onClick={onClose}>Cancel</Button>}
							<Button onClick={onSubmitHandler} type="primary">
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
