import { useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { Input } from '@signozhq/ui/input';
import { Form, Input as AntdInput } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import signUpApi from 'api/v1/register/post';
import passwordAuthNContext from 'api/v2/sessions/email_password/post';
import afterLogin from 'AppRoutes/utils';
import AuthError from 'components/AuthError/AuthError';
import AuthPageContainer from 'components/AuthPageContainer';
import { useNotifications } from 'hooks/useNotifications';
import { ArrowRight } from '@signozhq/icons';
import APIError from 'types/api/error';
import { useLocation, useHistory } from 'react-router-dom';
import getInvite from 'api/v1/invite/get';

import tvUrl from '@/assets/svgs/tv.svg';

import { FormContainer, Label } from './styles';

import './SignUp.styles.scss';

type FormValues = {
	email: string;
	organizationName: string;
	password: string;
	confirmPassword: string;
	hasOptedUpdates: boolean;
	isAnonymous: boolean;
};

function SignUp(): JSX.Element {
	const [loading, setLoading] = useState(false);
	const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

	const [formError, setFormError] = useState<APIError | null>();

	const { notifications } = useNotifications();
	const [form] = Form.useForm<FormValues>();

	// Watch form values for reactive validation
	const email = Form.useWatch('email', form);
	const password = Form.useWatch('password', form);
	const confirmPassword = Form.useWatch('confirmPassword', form);

	// Token validation
	const location = useLocation();
	const history = useHistory();
	const searchParams = new URLSearchParams(location.search);
	const inviteToken = searchParams.get('token');
	const [isInvalidToken, setIsInvalidToken] = useState(false);
	const [isValidatingToken, setIsValidatingToken] = useState(false);
	useEffect(() => {
		// No token = first admin signup, skip validation
		if (!inviteToken) {
			return;
		}

		setIsValidatingToken(true);
		getInvite(inviteToken)
			.then(() => {
				// token is valid, do nothing
			})
			.catch(() => {
				setIsInvalidToken(true);
			})
			.finally(() => {
				setIsValidatingToken(false);
			});
	}, [inviteToken]);
	const signUp = async (values: FormValues): Promise<void> => {
		try {
			const { organizationName, password, email } = values;
			const user = await signUpApi({
				email,
				orgDisplayName: organizationName,
				password,
			});

			const token = await passwordAuthNContext({
				email,
				password,
				orgId: user.data.orgId,
			});

			await afterLogin(token.data.accessToken, token.data.refreshToken);
		} catch (error) {
			setFormError(error as APIError);
		}
	};

	const handleSubmit = (): void => {
		(async (): Promise<void> => {
			try {
				const values = form.getFieldsValue();
				setLoading(true);
				setFormError(null);

				await signUp(values);
				logEvent('Account Created Successfully', {
					email: values.email,
				});

				setLoading(false);
			} catch (error) {
				notifications.error({
					message: 'Something went wrong',
				});
				setLoading(false);
			}
		})();
	};

	const isPasswordMismatch =
		Boolean(confirmPassword) && password !== confirmPassword;

	const showPasswordMismatchError = confirmPasswordTouched && isPasswordMismatch;

	const isValidForm = useMemo(
		(): boolean =>
			!loading &&
			Boolean(email?.trim()) &&
			Boolean(password?.trim()) &&
			Boolean(confirmPassword?.trim()) &&
			password === confirmPassword,
		[loading, email, password, confirmPassword],
	);
	if (isValidatingToken) {
		return (
			<AuthPageContainer>
				<div className="signup-card">
					<div className="signup-form-header">
						<Typography.Text className="signup-header-subtitle">
							Validating your invite link...
						</Typography.Text>
					</div>
				</div>
			</AuthPageContainer>
		);
	}

	if (isInvalidToken) {
		return (
			<AuthPageContainer>
				<div className="signup-card">
					<div className="signup-form-header">
						<div className="signup-header-icon">
							<img src={tvUrl} alt="TV" width="32" height="32" />
						</div>
						<Typography.Title level={4} className="signup-header-title">
							Invalid Invite Link
						</Typography.Title>
						<Typography.Text className="signup-header-subtitle">
							This invitation link is invalid or has expired. Please contact your
							administrator for a new invite.
						</Typography.Text>
					</div>
					<Callout
						type="error"
						size="small"
						showIcon
						className="signup-info-callout"
					>
						Need access? Ask your SigNoz admin to send you a new invite link from
						Settings → Org Settings.
					</Callout>
					<div className="signup-form-actions">
						<Button
							variant="solid"
							color="primary"
							type="submit"
							className="signup-submit-button"
							suffix={<ArrowRight size={16} />}
							onClick={(): void => {
								history.push('/login');
							}}
						>
							Go to Login
						</Button>
					</div>
				</div>
			</AuthPageContainer>
		);
	}
	return (
		<AuthPageContainer>
			<div className="signup-card">
				<div className="signup-form-header">
					<div className="signup-header-icon">
						<img src={tvUrl} alt="TV" width="32" height="32" />
					</div>
					<Typography.Title level={4} className="signup-header-title">
						Create your account
					</Typography.Title>
					<Typography.Text className="signup-header-subtitle">
						You&apos;re almost in. Create a password to start monitoring your
						applications with SigNoz.
					</Typography.Text>
				</div>

				<FormContainer onFinish={handleSubmit} form={form} className="signup-form">
					<div className="signup-form-container">
						<div className="signup-form-fields">
							<div className="signup-field-container">
								<Label htmlFor="signupEmail">Email address</Label>
								<FormContainer.Item noStyle name="email">
									<Input
										placeholder="e.g. john@signoz.io"
										type="email"
										autoFocus
										required
										id="signupEmail"
										className="signup-form-input"
									/>
								</FormContainer.Item>
							</div>

							<div className="signup-field-container">
								<Label htmlFor="currentPassword">Set your password</Label>
								<FormContainer.Item
									name="password"
									validateTrigger="onBlur"
									rules={[{ required: true, message: 'Please enter password!' }]}
								>
									<AntdInput.Password
										required
										id="currentPassword"
										placeholder="Enter new password"
										disabled={loading}
										className="signup-antd-input"
									/>
								</FormContainer.Item>
							</div>

							<div className="signup-field-container">
								<Label htmlFor="confirmPassword">Confirm your new password</Label>
								<FormContainer.Item
									name="confirmPassword"
									validateTrigger="onBlur"
									validateStatus={showPasswordMismatchError ? 'error' : undefined}
									help={
										showPasswordMismatchError
											? "Passwords don't match. Please try again."
											: undefined
									}
									rules={[{ required: true, message: 'Please enter confirm password!' }]}
								>
									<AntdInput.Password
										required
										id="confirmPassword"
										placeholder="Confirm your new password"
										disabled={loading}
										className="signup-antd-input"
										onBlur={() => setConfirmPasswordTouched(true)}
									/>
								</FormContainer.Item>
							</div>
						</div>
					</div>

					{!inviteToken && (
						<Callout
							type="info"
							size="small"
							showIcon
							className="signup-info-callout"
						>
							This will create an admin account. If you are not an admin, please ask
							your admin for an invite link
						</Callout>
					)}

					{formError && <AuthError error={formError} />}

					<div className="signup-form-actions">
						<Button
							variant="solid"
							color="primary"
							type="submit"
							data-attr="signup"
							disabled={!isValidForm}
							className="signup-submit-button"
							suffix={<ArrowRight size={16} />}
						>
							Access My Workspace
						</Button>
					</div>
				</FormContainer>
			</div>
		</AuthPageContainer>
	);
}

export default SignUp;
