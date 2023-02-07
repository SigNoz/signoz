import { Button, Input, notification } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import getFeaturesFlags from 'api/features/getFeatureFlags';
import apply from 'api/licenses/apply';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryObserverResult, RefetchOptions, useQuery } from 'react-query';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { AppAction, UPDATE_FEATURE_FLAGS } from 'types/actions/app';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/licenses/getAll';

import { ApplyForm, ApplyFormContainer, LicenseInput } from './styles';

function ApplyLicenseForm({
	licenseRefetch,
}: ApplyLicenseFormProps): JSX.Element {
	const { t } = useTranslation(['licenses']);
	const [key, setKey] = useState('');
	const [loading, setLoading] = useState(false);
	const dispatch = useDispatch<Dispatch<AppAction>>();
	const { refetch } = useQuery({
		queryFn: getFeaturesFlags,
		queryKey: 'getFeatureFlags',
		enabled: false,
	});

	const [notifications, NotificationElement] = notification.useNotification();

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
				const [featureFlagsResponse] = await Promise.all([
					refetch(),
					licenseRefetch(),
				]);
				if (featureFlagsResponse.data?.payload) {
					dispatch({
						type: UPDATE_FEATURE_FLAGS,
						payload: featureFlagsResponse.data.payload,
					});
				}
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
			{NotificationElement}
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
