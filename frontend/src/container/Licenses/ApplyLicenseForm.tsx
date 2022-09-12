import { Button, Input, notification } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import apply from 'api/licenses/apply';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApplyForm, ApplyFormContainer, LicenseInput } from './applyFormStyles';

function ApplyLicenseForm(): JSX.Element {
	const { t } = useTranslation(['licenses']);
	const [key, setKey] = useState('');
	const [loading, setLoading] = useState(false);

	const onFinish = async (values: unknown | { key: string }): Promise<void> => {
		const params = values as { key: string };
		if (params.key === '' || !params.key) {
			notification.error({
				message: 'Error',
				description: t('enter_license_key'),
			});
			return;
		}

		setLoading(true);
		try {
			const response = await apply({
				key: params.key,
			});

			if (response.statusCode === 200) {
				notification.success({
					message: 'Success',
					description: t('license_applied'),
				});
			} else {
				notification.error({
					message: 'Error',
					description: response.error || t('unexpected_error'),
				});
			}
		} catch (e) {
			notification.error({
				message: 'Error',
				description: t('unexpected_error'),
			});
		}
		setLoading(false);
	};

	return (
		<ApplyFormContainer>
			<ApplyForm layout="inline" onFinish={onFinish}>
				<LicenseInput labelAlign="left" name="key">
					<Input
						onChange={(e): void => {
							setKey(e.target.value as string);
						}}
						placeholder={t('placeholder_license_key')}
					/>
				</LicenseInput>
				<FormItem>
					<Button
						loading={loading}
						disabled={loading}
						type="primary"
						htmlType="submit"
					>
						{t('button_apply')}
					</Button>
				</FormItem>
			</ApplyForm>
			{key && <div style={{ paddingLeft: '0.5em', color: '#666' }}> {key}</div>}
		</ApplyFormContainer>
	);
}

export default ApplyLicenseForm;
