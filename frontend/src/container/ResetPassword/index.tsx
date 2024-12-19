import { Button, Form, Input, Typography } from 'antd';
import resetPasswordApi from 'api/user/resetPassword';
import { Logout } from 'api/utils';
import WelcomeLeftContainer from 'components/WelcomeLeftContainer';
import ROUTES from 'constants/routes';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { Label } from 'pages/SignUp/styles';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-use';

import { ButtonContainer, FormContainer, FormWrapper } from './styles';

const { Title } = Typography;

type FormValues = { password: string; confirmPassword: string };

function ResetPassword({ version }: ResetPasswordProps): JSX.Element {
	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);

	const [isValidPassword, setIsValidPassword] = useState(false);
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

	const handleFormSubmit: () => Promise<void> = async () => {
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

	const validatePassword = (): boolean => {
		const { password, confirmPassword } = form.getFieldsValue();

		if (
			password &&
			confirmPassword &&
			password.trim() &&
			confirmPassword.trim() &&
			password.length > 0 &&
			confirmPassword.length > 0
		) {
			return password === confirmPassword;
		}

		return false;
	};

	const handleValuesChange = useDebouncedFn((): void => {
		const { password, confirmPassword } = form.getFieldsValue();

		if (!password || !confirmPassword) {
			setIsValidPassword(false);
		}

		if (
			password &&
			confirmPassword &&
			password.trim() &&
			confirmPassword.trim()
		) {
			const isValid = validatePassword();

			setIsValidPassword(isValid);
			setConfirmPasswordError(!isValid);
		}
	}, 100);

	const handleSubmit = (): void => {
		const isValid = validatePassword();
		setIsValidPassword(isValid);

		if (token) {
			handleFormSubmit();
		}
	};

	return (
		<WelcomeLeftContainer version={version}>
			<FormWrapper>
				<FormContainer form={form} onFinish={handleSubmit}>
					<Title level={4}>Reset Your Password</Title>

					<div>
						<Label htmlFor="password">Password</Label>
						<Form.Item
							name="password"
							validateTrigger="onBlur"
							rules={[{ required: true, message: 'Please enter  password!' }]}
						>
							<Input.Password
								tabIndex={0}
								onChange={handleValuesChange}
								id="password"
								data-testid="password"
							/>
						</Form.Item>
					</div>
					<div>
						<Label htmlFor="confirmPassword">Confirm Password</Label>
						<Form.Item
							name="confirmPassword"
							// validateTrigger="onChange"
							validateTrigger="onBlur"
							rules={[{ required: true, message: 'Please enter confirm password!' }]}
						>
							<Input.Password
								onChange={handleValuesChange}
								id="confirmPassword"
								data-testid="confirmPassword"
							/>
						</Form.Item>

						{confirmPasswordError && (
							<Typography.Paragraph
								italic
								style={{
									color: '#D89614',
									marginTop: '0.50rem',
								}}
							>
								The passwords entered do not match. Please double-check and re-enter
								your passwords.
							</Typography.Paragraph>
						)}
					</div>

					<ButtonContainer>
						<Button
							type="primary"
							htmlType="submit"
							data-attr="signup"
							loading={loading}
							disabled={!isValidPassword || loading}
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
