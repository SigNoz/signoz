import { Button, Form, Input } from 'antd';
import apply from 'api/licenses/apply';
import { useNotifications } from 'hooks/useNotifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requireErrorMessage } from 'utils/form/requireErrorMessage';

import {
	ApplyForm,
	ApplyFormContainer,
	KeyPreview,
	LicenseInput,
} from './styles';

function ApplyLicenseForm({
	licenseRefetch,
}: ApplyLicenseFormProps): JSX.Element {
	const { t } = useTranslation(['licenses']);
	const [isLoading, setIsLoading] = useState(false);
	const [form] = Form.useForm<FormValues>();

	const { notifications } = useNotifications();
	const key = Form.useWatch('key', form);

	const isDisabled = isLoading || !key;

	const onFinish = async (values: unknown | { key: string }): Promise<void> => {
		const params = values as { key: string };
		if (params.key === '' || !params.key) {
			notifications.error({
				message: 'Error',
				description: t('enter_license_key'),
			});
			return;
		}

		setIsLoading(true);
		try {
			const response = await apply({
				key: params.key,
			});

			if (response.statusCode === 200) {
				await Promise.all([licenseRefetch()]);

				notifications.success({
					message: 'Success',
					description: t('license_applied'),
				});
			} else {
				notifications.error({
					message: 'Error',
					description: response.error || t('unexpected_error'),
				});
			}
		} catch (e) {
			notifications.error({
				message: 'Error',
				description: t('unexpected_error'),
			});
		}
		setIsLoading(false);
	};

	return (
		<ApplyFormContainer>
			<ApplyForm
				form={form}
				layout="inline"
				onFinish={onFinish}
				autoComplete="off"
			>
				<LicenseInput
					name="key"
					rules={[{ required: true, message: requireErrorMessage('License Key') }]}
				>
					<Input placeholder={t('placeholder_license_key')} />
				</LicenseInput>
				<Form.Item>
					<Button
						loading={isLoading}
						disabled={isDisabled}
						type="primary"
						htmlType="submit"
					>
						{t('button_apply')}
					</Button>
				</Form.Item>
			</ApplyForm>
			{key && <KeyPreview>{key}</KeyPreview>}
		</ApplyFormContainer>
	);
}

interface ApplyLicenseFormProps {
	licenseRefetch: () => void;
}

interface FormValues {
	key: string;
}

export default ApplyLicenseForm;
