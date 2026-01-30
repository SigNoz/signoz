import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { Input } from '@signozhq/input';
import { Form, Input as AntdInput, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import accept from 'api/v1/invite/id/accept';
import getInviteDetails from 'api/v1/invite/id/get';
import signUpApi from 'api/v1/register/post';
import passwordAuthNContext from 'api/v2/sessions/email_password/post';
import afterLogin from 'AppRoutes/utils';
import AuthError from 'components/AuthError/AuthError';
import AuthPageContainer from 'components/AuthPageContainer';
import { useNotifications } from 'hooks/useNotifications';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { InviteDetails } from 'types/api/user/getInviteDetails';

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

	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);
	const [formError, setFormError] = useState<APIError | null>();
	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const token = params.get('token');
	const [isDetailsDisable, setIsDetailsDisable] = useState<boolean>(false);

	const getInviteDetailsResponse = useQuery<
		SuccessResponseV2<InviteDetails>,
		APIError
	>({
		queryFn: () =>
			getInviteDetails({
				inviteId: token || '',
			}),
		queryKey: ['getInviteDetails', token],
		enabled: token !== null,
	});

	const { notifications } = useNotifications();
	const [form] = Form.useForm<FormValues>();

	// Watch form values for reactive validation
	const email = Form.useWatch('email', form);
	const password = Form.useWatch('password', form);
	const confirmPassword = Form.useWatch('confirmPassword', form);

	useEffect(() => {
		if (
			getInviteDetailsResponse.status === 'success' &&
			getInviteDetailsResponse.data.data
		) {
			const responseDetails = getInviteDetailsResponse.data.data;
			form.setFieldValue('email', responseDetails.email);
			form.setFieldValue('organizationName', responseDetails.organization);
			setIsDetailsDisable(true);

			logEvent('Account Creation Page Visited', {
				email: responseDetails.email,
				name: responseDetails.name,
				company_name: responseDetails.organization,
				source: 'SigNoz Cloud',
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		getInviteDetailsResponse.data?.data,
		form,
		getInviteDetailsResponse.status,
	]);

	useEffect(() => {
		if (
			getInviteDetailsResponse.status === 'success' &&
			getInviteDetailsResponse?.error
		) {
			const { error } = getInviteDetailsResponse;
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
			});
		}
	}, [
		getInviteDetailsResponse,
		getInviteDetailsResponse.data,
		getInviteDetailsResponse.status,
		notifications,
	]);

	const isSignUp = token === null;

	const signUp = async (values: FormValues): Promise<void> => {
		try {
			const { organizationName, password, email } = values;
			const user = await signUpApi({
				email,
				orgDisplayName: organizationName,
				password,
				token: params.get('token') || undefined,
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

	const acceptInvite = async (values: FormValues): Promise<void> => {
		try {
			const { password, email } = values;
			const user = await accept({
				password,
				token: params.get('token') || '',
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

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const handleSubmit = (): void => {
		(async (): Promise<void> => {
			try {
				const values = form.getFieldsValue();
				setLoading(true);
				setFormError(null);

				if (isSignUp) {
					await signUp(values);
					logEvent('Account Created Successfully', {
						email: values.email,
					});
				} else {
					await acceptInvite(values);
				}

				setLoading(false);
			} catch (error) {
				notifications.error({
					message: 'Something went wrong',
				});
				setLoading(false);
			}
		})();
	};

	const handleValuesChange: (changedValues: Partial<FormValues>) => void = (
		changedValues,
	) => {
		// Clear error if passwords match while typing (but don't set error until blur)
		if ('password' in changedValues || 'confirmPassword' in changedValues) {
			const { password, confirmPassword } = form.getFieldsValue();

			if (password && confirmPassword && password === confirmPassword) {
				setConfirmPasswordError(false);
			}
		}
	};

	const handlePasswordBlur = (): void => {
		const { password, confirmPassword } = form.getFieldsValue();
		// Only validate if confirm password has a value
		if (confirmPassword) {
			const isSamePassword = password === confirmPassword;
			setConfirmPasswordError(!isSamePassword);
		}
	};

	const handleConfirmPasswordBlur = (): void => {
		const { password, confirmPassword } = form.getFieldsValue();
		if (password && confirmPassword) {
			const isSamePassword = password === confirmPassword;
			setConfirmPasswordError(!isSamePassword);
		}
	};

	const isValidForm = useMemo(
		(): boolean =>
			!loading &&
			Boolean(email?.trim()) &&
			Boolean(password?.trim()) &&
			Boolean(confirmPassword?.trim()) &&
			!confirmPasswordError,
		[loading, email, password, confirmPassword, confirmPasswordError],
	);

	return (
		<AuthPageContainer>
			<div className="signup-card">
				<div className="signup-form-header">
					<div className="signup-header-icon">
						<img src="/svgs/tv.svg" alt="TV" width="32" height="32" />
					</div>
					<Typography.Title level={4} className="signup-header-title">
						Create your account
					</Typography.Title>
					<Typography.Paragraph className="signup-header-subtitle">
						You&apos;re almost in. Create a password to start monitoring your
						applications with SigNoz.
					</Typography.Paragraph>
				</div>

				<FormContainer
					onFinish={handleSubmit}
					onValuesChange={handleValuesChange}
					form={form}
					className="signup-form"
				>
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
										disabled={isDetailsDisable}
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
										onBlur={handlePasswordBlur}
									/>
								</FormContainer.Item>
							</div>

							<div className="signup-field-container">
								<Label htmlFor="confirmPassword">Confirm your new password</Label>
								<FormContainer.Item
									name="confirmPassword"
									validateTrigger="onBlur"
									rules={[{ required: true, message: 'Please enter confirm password!' }]}
								>
									<AntdInput.Password
										required
										id="confirmPassword"
										placeholder="Confirm your new password"
										disabled={loading}
										className="signup-antd-input"
										onBlur={handleConfirmPasswordBlur}
									/>
								</FormContainer.Item>
							</div>
						</div>
					</div>

					{isSignUp && (
						<Callout
							type="info"
							size="small"
							showIcon
							className="signup-info-callout"
							description="This will create an admin account. If you are not an admin, please ask your admin for an invite link"
						/>
					)}

					{confirmPasswordError && (
						<Callout
							type="error"
							size="small"
							showIcon
							icon={<CircleAlert size={12} />}
							className="signup-error-callout"
							description="Passwords don't match. Please try again."
						/>
					)}

					{formError && !confirmPasswordError && <AuthError error={formError} />}

					<div className="signup-form-actions">
						<Button
							variant="solid"
							color="primary"
							type="submit"
							data-attr="signup"
							disabled={!isValidForm}
							className="signup-submit-button"
							suffixIcon={<ArrowRight size={16} />}
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
