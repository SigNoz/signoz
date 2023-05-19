import { Button, Form, Input } from 'antd';
import apply from 'api/licenses/apply';
import { useNotifications } from 'hooks/useNotifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryObserverResult, RefetchOptions } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/licenses/getAll';
import AppReducer from 'types/reducer/app';

import { ApplyForm, ApplyFormContainer, LicenseInput } from './styles';

const FormItem = Form.Item;

function ApplyLicenseForm({
	licenseRefetch,
}: ApplyLicenseFormProps): JSX.Element {
	const { t } = useTranslation(['licenses']);
	const [key, setKey] = useState('');
	const [loading, setLoading] = useState(false);
	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const { notifications } = useNotifications();

	const onFinish = async (values: unknown | { key: string }): Promise<void> => {
		const params = values as { key: string };
		if (params.key === '' || !params.key) {
			notifications.error({
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
				await Promise.all([featureResponse?.refetch(), licenseRefetch()]);

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

interface ApplyLicenseFormProps {
	licenseRefetch: (
		options?: RefetchOptions,
	) => Promise<
		QueryObserverResult<SuccessResponse<PayloadProps> | ErrorResponse, unknown>
	>;
}

export default ApplyLicenseForm;
