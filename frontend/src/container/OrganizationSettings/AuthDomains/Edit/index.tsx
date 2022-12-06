import { Button, Form, notification, Space } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthDomain, GOOGLE_AUTH, SAML } from 'types/api/SAML/listDomain';

import EditGoogleAuth from './EditGoogleAuth';
import EditSAML from './EditSAML';
import { parseGoogleAuthForm, parseSamlForm } from './helpers';

// renderFormInputs selectively renders form fields depending upon
// sso type
const renderFormInputs = (
	record: AuthDomain | undefined,
): JSX.Element | undefined => {
	switch (record?.ssoType) {
		case GOOGLE_AUTH:
			return <EditGoogleAuth />;
		case SAML:
		default:
			return <EditSAML />;
	}
};

function EditSSO({
	onRecordUpdateHandler,
	record,
	setEditModalOpen,
}: EditFormProps): JSX.Element {
	const [form] = useForm<AuthDomain>();

	const { t } = useTranslation(['common']);

	const onFinishHandler = useCallback(() => {
		form
			.validateFields()
			.then(async (values) => {
				await onRecordUpdateHandler({
					...record,
					ssoEnabled: true,
					ssoType: record.ssoType,
					samlConfig: parseSamlForm(record, values),
					googleAuthConfig: parseGoogleAuthForm(record, values),
				});
			})
			.catch(() => {
				notification.error({
					message: t('something_went_wrong', { ns: 'common' }),
				});
			});
	}, [form, onRecordUpdateHandler, record, t]);

	const onResetHandler = useCallback(() => {
		form.resetFields();
		setEditModalOpen(false);
	}, [setEditModalOpen, form]);

	return (
		<Form
			name="basic"
			initialValues={record}
			onFinishFailed={(error): void => {
				error.errorFields.forEach(({ errors }) => {
					notification.error({
						message:
							errors[0].toString() || t('something_went_wrong', { ns: 'common' }),
					});
				});
				form.resetFields();
			}}
			layout="vertical"
			onFinish={onFinishHandler}
			autoComplete="off"
			form={form}
		>
			{renderFormInputs(record)}
			<Space
				style={{ width: '100%', justifyContent: 'flex-end' }}
				align="end"
				direction="horizontal"
			>
				<Button htmlType="button" onClick={onResetHandler}>
					Cancel
				</Button>
				<Button type="primary" htmlType="submit">
					Save Settings
				</Button>
			</Space>
		</Form>
	);
}

interface EditFormProps {
	onRecordUpdateHandler: (record: AuthDomain) => Promise<boolean>;
	record: AuthDomain;
	setEditModalOpen: (open: boolean) => void;
}

export default EditSSO;
