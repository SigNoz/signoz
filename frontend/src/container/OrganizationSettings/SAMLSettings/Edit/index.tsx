import { Form, Input, notification } from 'antd';
import { FormInstance } from 'antd/es/form/Form';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function EditSaml({
	certificate,
	entityId,
	url,
	form,
}: EditFormProps): JSX.Element {
	const { t } = useTranslation(['common']);

	const onFinishFailed = useCallback(() => {
		form.resetFields();
		notification.error({
			message: t('something_went_wrong', { ns: 'common' }),
		});
	}, [form, t]);

	useEffect(() => {
		form.setFieldsValue({
			certificate,
			entityId,
			url,
		});
	}, [certificate, entityId, form, url]);

	return (
		<Form
			name="basic"
			labelCol={{ span: 8 }}
			wrapperCol={{ span: 16 }}
			initialValues={{ remember: true }}
			onFinishFailed={onFinishFailed}
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

			<Form.Item label="SAML X.509 Certificate" name="certificate">
				<Input.TextArea />
			</Form.Item>
		</Form>
	);
}

export interface EditFormProps {
	url: string;
	entityId: string;
	certificate: string;
	form: FormInstance<EditFormProps>;
}

export default EditSaml;
