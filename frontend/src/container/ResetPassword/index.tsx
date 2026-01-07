import './ResetPassword.styles.scss';

import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { Form, Input as AntdInput, Typography } from 'antd';
import { Logout } from 'api/utils';
import resetPasswordApi from 'api/v1/factor_password/resetPassword';
import AuthPageContainer from 'components/AuthPageContainer';
import ROUTES from 'constants/routes';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { ArrowRight, KeyRound } from 'lucide-react';
import { Label } from 'pages/SignUp/styles';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-use';
import APIError from 'types/api/error';

import { FormContainer } from './styles';

type FormValues = { password: string; confirmPassword: string };

function ResetPassword({ version }: ResetPasswordProps): JSX.Element {
	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);

	const [errorMessage, setErrorMessage] = useState<APIError | null>();

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
			setErrorMessage(null);
			const { password } = form.getFieldsValue();

			await resetPasswordApi({
				password,
				token: token || '',
			});

			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
			history.push(ROUTES.LOGIN);

			setLoading(false);
		} catch (error) {
			setLoading(false);
			setErrorMessage(error as APIError);
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
		<AuthPageContainer>
			<div className="reset-password-card">
				<div className="reset-password-header">
					<div className="reset-password-header-icon">
						<KeyRound size={32} />
					</div>
					<Typography.Title level={4} className="reset-password-header-title">
						Reset Your Password
					</Typography.Title>
					<Typography.Paragraph className="reset-password-header-subtitle">
						Monitor your applications. Find what is causing issues.
					</Typography.Paragraph>
					{version && (
						<div className="reset-password-version-badge">SigNoz {version}</div>
					)}
				</div>

				<FormContainer
					form={form}
					onFinish={handleSubmit}
					className="reset-password-form"
				>
					<div className="reset-password-form-container">
						<div className="reset-password-form-fields">
							<div className="reset-password-field-container">
								<Label htmlFor="password">New Password</Label>
								<Form.Item
									name="password"
									validateTrigger="onBlur"
									rules={[{ required: true, message: 'Please enter password!' }]}
								>
									<AntdInput.Password
										tabIndex={0}
										onChange={handleValuesChange}
										id="password"
										data-testid="password"
										placeholder="Enter new password"
										className="reset-password-form-input"
									/>
								</Form.Item>
							</div>

							<div className="reset-password-field-container">
								<Label htmlFor="confirmPassword">Confirm New Password</Label>
								<Form.Item
									name="confirmPassword"
									validateTrigger="onBlur"
									rules={[{ required: true, message: 'Please enter confirm password!' }]}
								>
									<AntdInput.Password
										onChange={handleValuesChange}
										id="confirmPassword"
										data-testid="confirmPassword"
										placeholder="Confirm your new password"
										className="reset-password-form-input"
									/>
								</Form.Item>
							</div>
						</div>
					</div>

					{confirmPasswordError && (
						<Callout
							type="error"
							size="small"
							showIcon
							className="reset-password-error-callout"
							description="Passwords don't match. Please try again."
						/>
					)}

					{errorMessage && !confirmPasswordError && (
						<Callout
							type="error"
							size="small"
							showIcon
							className="reset-password-error-callout"
							message={errorMessage?.getErrorCode() || undefined}
							description={errorMessage?.getErrorMessage() || 'Something went wrong'}
						/>
					)}

					<div className="reset-password-form-actions">
						<Button
							variant="solid"
							color="primary"
							type="submit"
							onClick={handleSubmit}
							data-attr="reset-password"
							disabled={!isValidPassword || loading}
							className="reset-password-submit-button"
							suffixIcon={<ArrowRight size={16} />}
						>
							Reset Password
						</Button>
					</div>
				</FormContainer>
			</div>
		</AuthPageContainer>
	);
}

interface ResetPasswordProps {
	version: string;
}

export default ResetPassword;
