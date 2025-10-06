import {
	GoogleSquareFilled,
	InfoCircleFilled,
	KeyOutlined,
} from '@ant-design/icons';
import { Button, Form, FormInstance, Input, Modal, Typography } from 'antd';
import post from 'api/v1/domains/post';
import { FeatureKeys } from 'constants/features';
import { defaultTo } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useState } from 'react';
import APIError from 'types/api/error';
import { GettableAuthDomain } from 'types/api/v1/domains/list';
import { PostableAuthDomain } from 'types/api/v1/domains/post';

interface CreateOrEditProps {
	isCreate: boolean;
	onClose: () => void;
	record?: GettableAuthDomain;
}

function AuthnProviderSelector({
	setAuthnProvider,
	samlEnabled,
}: {
	setAuthnProvider: React.Dispatch<React.SetStateAction<string>>;
	samlEnabled: boolean;
}): JSX.Element {
	return (
		<div>
			<section>
				<Typography.Text>Configure Authentication Method</Typography.Text>
				<Typography.Paragraph>
					SigNoz supports the following single sign-on services (SSO). Get started
					with setting your project’s SSO below
				</Typography.Paragraph>
			</section>
			<section>
				<div>
					<GoogleSquareFilled style={{ fontSize: '37px' }} />
					<div>
						<Typography.Text>Google Apps Authentication</Typography.Text>
						<Typography.Paragraph>
							Let members sign-in with a Google workspace account
						</Typography.Paragraph>
					</div>
					<Button onClick={(): void => setAuthnProvider('google_auth')}>
						Configure
					</Button>
				</div>
				{samlEnabled && (
					<div>
						<KeyOutlined style={{ fontSize: '37px' }} />,
						<div>
							<Typography.Text>SAML Authentication</Typography.Text>
							<Typography.Paragraph>
								Azure, Active Directory, Okta or your custom SAML 2.0 solution{' '}
							</Typography.Paragraph>
						</div>
						<Button onClick={(): void => setAuthnProvider('saml')}>Configure</Button>
					</div>
				)}
			</section>
		</div>
	);
}

function ConfigureSAMLAuthnProvider(): JSX.Element {
	return (
		<>
			<Form.Item
				label="Domain"
				name="name"
				rules={[{ required: true, message: 'Please input your domain name' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="SAML ACS URL"
				name={['samlConfig', 'samlIdp']}
				rules={[{ required: true, message: 'Please input your ACS URL!' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="SAML Entity ID"
				name={['samlConfig', 'samlEntity']}
				rules={[{ required: true, message: 'Please input your Entity Id!' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				rules={[{ required: true, message: 'Please input your Certificate!' }]}
				label="SAML X.509 Certificate"
				name={['samlConfig', 'samlCert']}
			>
				<Input.TextArea rows={4} />
			</Form.Item>

			<InfoCircleFilled />
			<Typography.Text>
				SAML won’t be enabled unless you enter all the attributes above
			</Typography.Text>
		</>
	);
}

function ConfigureGoogleAuthAuthnProvider(): JSX.Element {
	return (
		<>
			<Form.Item
				label="Domain"
				name="name"
				rules={[{ required: true, message: 'Please input your domain name' }]}
			>
				<Input />
			</Form.Item>
			<Typography.Paragraph>
				Enter OAuth 2.0 credentials obtained from the Google API Console below. Read
				the{' '}
				<a
					href="https://signoz.io/docs/userguide/sso-authentication"
					target="_blank"
					rel="noreferrer"
				>
					docs
				</a>{' '}
				for more information.
			</Typography.Paragraph>
			<Form.Item
				label="Client ID"
				name={['googleAuthConfig', 'clientId']}
				rules={[{ required: true, message: 'Please input Google Auth Client ID!' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Client Secret"
				name={['googleAuthConfig', 'clientSecret']}
				rules={[
					{ required: true, message: 'Please input Google Auth Client Secret!' },
				]}
			>
				<Input />
			</Form.Item>

			<Typography.Text>
				Google OAuth2 won’t be enabled unless you enter all the attributes above
			</Typography.Text>
		</>
	);
}

function ConfigureOIDCAuthnProvider(): JSX.Element {
	return <div>Configure OIDC</div>;
}

function configureAuthnProvider(
	form: FormInstance<PostableAuthDomain>,
): JSX.Element {
	switch (form.getFieldValue('ssoType')) {
		case 'saml':
			return <ConfigureSAMLAuthnProvider />;
		case 'google_auth':
			return <ConfigureGoogleAuthAuthnProvider />;
		case 'oidc':
			return <ConfigureOIDCAuthnProvider />;
		default:
			return <ConfigureGoogleAuthAuthnProvider />;
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
		console.log(name, googleAuthConfig, samlConfig);

		try {
			if (isCreate) {
				await post({
					name,
					config: {
						ssoEnabled: true,
						ssoType: authnProvider,
						googleAuthConfig: form.getFieldValue('googleAuthConfig'),
						samlConfig: form.getFieldValue('samlConfig'),
						oidcConfig: form.getFieldValue('oidcConfig'),
					},
				});
			}

			onClose();
		} catch (error) {
			showErrorModal(error as APIError);
		}
	};

	return (
		<Modal open onCancel={onClose} onOk={onSubmitHandler}>
			<Form
				initialValues={defaultTo(record, {
					name: '',
					ssoEnabled: false,
					ssoType: '',
				})}
				form={form}
				onFinish={onSubmitHandler}
			>
				{isCreate && authnProvider === '' && (
					<AuthnProviderSelector
						setAuthnProvider={setAuthnProvider}
						samlEnabled={samlEnabled}
					/>
				)}
				{authnProvider !== '' && configureAuthnProvider(form)}
			</Form>
		</Modal>
	);
}

CreateOrEdit.defaultProps = {
	record: null,
};

export default CreateOrEdit;
