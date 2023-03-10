import { Button, Form, Input, Typography } from 'antd';
import resetPasswordApi from 'api/user/resetPassword';
import { Logout } from 'api/utils';
import WelcomeLeftContainer from 'components/WelcomeLeftContainer';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { Label } from 'pages/SignUp/styles';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-use';

import { ButtonContainer, FormContainer, FormWrapper } from './styles';

const { Title } = Typography;

type FormValues = { password: string; confirmPassword: string };

function ResetPassword({ version }: ResetPasswordProps): JSX.Element {
	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);
	const [loading, setLoading] = useState(false);
	const { t } = useTranslation(['common']);
	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const token = params.get('token');
	const { notifications } = useNotifications();

	const [form] = Form.useForm<FormValues>();
	useEffect(() => {
		if (!token) {
			Logout();
			history.push(ROUTES.LOGIN);
		}
	}, [token]);

	const handleSubmit: () => Promise<void> = async () => {
		try {
			setLoading(true);
			const { password } = form.getFieldsValue();

			const response = await resetPasswordApi({
				password,
				token: token || '',
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
				history.push(ROUTES.LOGIN);
			} else {
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}

			setLoading(false);
		} catch (error) {
			setLoading(false);
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};
	const handleValuesChange: (changedValues: FormValues) => void = (
		changedValues,
	) => {
		if ('confirmPassword' in changedValues) {
			const { confirmPassword } = changedValues;

			const isSamePassword = form.getFieldValue('password') === confirmPassword;
			setConfirmPasswordError(!isSamePassword);
		}
	};

	return (
		<WelcomeLeftContainer version={version}>
			<FormWrapper>
				<FormContainer
					form={form}
					onValuesChange={handleValuesChange}
					onFinish={handleSubmit}
				>
					<Title level={4}>Reset Your Password</Title>

					<div>
						<Label htmlFor="Password">Password</Label>
						<FormContainer.Item noStyle name="password">
							<Input.Password required id="currentPassword" />
						</FormContainer.Item>
					</div>
					<div>
						<Label htmlFor="ConfirmPassword">Confirm Password</Label>
						<FormContainer.Item noStyle name="confirmPassword">
							<Input.Password required id="UpdatePassword" />
						</FormContainer.Item>

						{confirmPasswordError && (
							<Typography.Paragraph
								italic
								style={{
									color: '#D89614',
									marginTop: '0.50rem',
								}}
							>
								Passwords don’t match. Please try again
							</Typography.Paragraph>
						)}
					</div>

					<ButtonContainer>
						<Button
							type="primary"
							htmlType="submit"
							data-attr="signup"
							loading={loading}
							disabled={
								loading ||
								!form.getFieldValue('password') ||
								!form.getFieldValue('confirmPassword') ||
								confirmPasswordError ||
								token === null
							}
						>
							Get Started
						</Button>
					</ButtonContainer>
				</FormContainer>
			</FormWrapper>
		</WelcomeLeftContainer>
	);
}

interface ResetPasswordProps {
	version: string;
}

export default ResetPassword;
