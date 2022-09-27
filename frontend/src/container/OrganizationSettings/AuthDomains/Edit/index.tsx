import { InfoCircleFilled } from '@ant-design/icons';
import {
	Button,
	Card,
	Form,
	Input,
	notification,
	Space,
	Typography,
} from 'antd';
import { useForm } from 'antd/lib/form/Form';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SAMLDomain } from 'types/api/SAML/listDomain';

function EditSaml({
	certificate,
	entityId,
	url,
	onRecordUpdateHandler,
	record,
	setEditModalOpen,
}: EditFormProps): JSX.Element {
	const [form] = useForm<EditFormProps>();

	const { t } = useTranslation(['common']);

	const onFinishHandler = useCallback(() => {
		form
			.validateFields()
			.then(async (values) => {
				await onRecordUpdateHandler({
					...record,
					samlConfig: {
						...record.samlConfig,
						samlCert: values.certificate,
						samlEntity: values.entityId,
						samlIdp: values.url,
					},
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
			initialValues={{ certificate, entityId, url }}
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
			<Form.Item
				label="SAML ACS URL"
				name="url"
				rules={[{ required: true, message: 'Please input your ACS URL!' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="SAML Entity ID"
				name="entityId"
				rules={[{ required: true, message: 'Please input your Entity Id!' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				rules={[{ required: true, message: 'Please input your Certificate!' }]}
				label="SAML X.509 Certificate"
				name="certificate"
			>
				<Input.TextArea rows={4} />
			</Form.Item>

			<Card style={{ marginBottom: '1rem' }}>
				<Space>
					<InfoCircleFilled />
					<Typography>
						SAML won’t be enabled unless you enter all the attributes above
					</Typography>
				</Space>
			</Card>

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
	url: string;
	entityId: string;
	certificate: string;
	onRecordUpdateHandler: (record: SAMLDomain) => Promise<boolean>;
	record: SAMLDomain;
	setEditModalOpen: (open: boolean) => void;
}

export default EditSaml;
