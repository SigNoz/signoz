import './ForgotPassword.styles.scss';

import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { Form, Input, Typography } from 'antd';
import forgotPasswordApi from 'api/v2/factor_password/forgotPassword';
import AuthError from 'components/AuthError/AuthError';
import AuthPageContainer from 'components/AuthPageContainer';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { ArrowLeft, ArrowRight, CheckCircle, KeyRound } from 'lucide-react';
import { Label } from 'pages/SignUp/styles';
import { useState } from 'react';
import { useLocation } from 'react-use';
import APIError from 'types/api/error';

import { FormContainer } from './styles';

type FormValues = { email: string };

function ForgotPassword(): JSX.Element {
	const [loading, setLoading] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<APIError | null>(null);
	const { notifications } = useNotifications();

	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const emailFromQuery = params.get('email') || '';
	const orgIdFromQuery = params.get('orgId') || '';

	const [form] = Form.useForm<FormValues>();

	const handleSubmit = async (): Promise<void> => {
		try {
			setLoading(true);
			setErrorMessage(null);
			const { email } = form.getFieldsValue();

			await forgotPasswordApi({
				email: email || emailFromQuery,
				orgId: orgIdFromQuery,
				frontendBaseURL: window.location.origin,
			});

			setSubmitted(true);
			notifications.success({
				message: 'Password reset email sent',
			});
		} catch (error) {
			setErrorMessage(error as APIError);
		} finally {
			setLoading(false);
		}
	};

	const handleBackToLogin = (): void => {
		history.push(ROUTES.LOGIN);
	};

	// Success state after submission
	if (submitted) {
		return (
			<AuthPageContainer>
				<div className="forgot-password-card">
					<div className="forgot-password-header">
						<div className="forgot-password-header-icon forgot-password-header-icon--success">
							<CheckCircle size={32} />
						</div>
						<Typography.Title level={4} className="forgot-password-header-title">
							Check Your Email
						</Typography.Title>
						<Typography.Paragraph className="forgot-password-header-subtitle">
							We have sent a password reset link to your email address. Please check
							your inbox and follow the instructions to reset your password.
						</Typography.Paragraph>
					</div>

					<div className="forgot-password-form-actions">
						<Button
							variant="solid"
							color="primary"
							onClick={handleBackToLogin}
							className="forgot-password-submit-button"
							prefixIcon={<ArrowLeft size={16} />}
						>
							Back to Login
						</Button>
					</div>
				</div>
			</AuthPageContainer>
		);
	}

	return (
		<AuthPageContainer>
			<div className="forgot-password-card">
				<div className="forgot-password-header">
					<div className="forgot-password-header-icon">
						<KeyRound size={32} />
					</div>
					<Typography.Title level={4} className="forgot-password-header-title">
						Forgot Password?
					</Typography.Title>
					<Typography.Paragraph className="forgot-password-header-subtitle">
						Enter your email address and we will send you a link to reset your
						password.
					</Typography.Paragraph>
				</div>

				<FormContainer
					form={form}
					onFinish={handleSubmit}
					className="forgot-password-form"
				>
					<div className="forgot-password-form-container">
						<div className="forgot-password-form-fields">
							<div className="forgot-password-field-container">
								<Label htmlFor="email">Email Address</Label>
								<Form.Item
									name="email"
									initialValue={emailFromQuery}
									rules={[
										{ required: true, message: 'Please enter your email!' },
										{ type: 'email', message: 'Please enter a valid email!' },
									]}
								>
									<Input
										type="email"
										id="email"
										data-testid="email"
										placeholder="Enter your email address"
										className="forgot-password-form-input"
										disabled={!!emailFromQuery}
									/>
								</Form.Item>
							</div>
						</div>
					</div>

					{!orgIdFromQuery && (
						<Callout
							type="warning"
							size="small"
							className="forgot-password-warning-callout"
							description="Please go back to the login page and enter your email first to reset your password."
						/>
					)}

					{errorMessage && <AuthError error={errorMessage} />}

					<div className="forgot-password-form-actions">
						<Button
							variant="ghost"
							onClick={handleBackToLogin}
							className="forgot-password-back-button"
							prefixIcon={<ArrowLeft size={16} />}
						>
							Back to Login
						</Button>
						<Button
							variant="solid"
							color="primary"
							type="submit"
							disabled={loading || !orgIdFromQuery}
							className="forgot-password-submit-button"
							suffixIcon={<ArrowRight size={16} />}
						>
							{loading ? 'Sending...' : 'Send Reset Link'}
						</Button>
					</div>
				</FormContainer>
			</div>
		</AuthPageContainer>
	);
}

export default ForgotPassword;
