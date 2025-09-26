import './SignUp.styles.scss';

import { Button, Form, Input, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import accept from 'api/v1/invite/id/accept';
import getInviteDetails from 'api/v1/invite/id/get';
import loginApi from 'api/v1/login/login';
import signUpApi from 'api/v1/register/signup';
import afterLogin from 'AppRoutes/utils';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { InviteDetails } from 'types/api/user/getInviteDetails';
import { Signup as LoginPrecheckPayloadProps } from 'types/api/user/loginPrecheck';

import { FormContainer, Label } from './styles';
import { isPasswordNotValidMessage, isPasswordValid } from './utils';

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

	const [precheck, setPrecheck] = useState<LoginPrecheckPayloadProps>({
		sso: false,
		isUser: false,
	});

	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);
	const [isPasswordPolicyError, setIsPasswordPolicyError] = useState<boolean>(
		false,
	);
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

	useEffect(() => {
		if (
			getInviteDetailsResponse.status === 'success' &&
			getInviteDetailsResponse.data.data
		) {
			const responseDetails = getInviteDetailsResponse.data.data;
			if (responseDetails.precheck) setPrecheck(responseDetails.precheck);
			form.setFieldValue('firstName', responseDetails.name);
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
	const { showErrorModal } = useErrorModal();

	const signUp = async (values: FormValues): Promise<void> => {
		try {
			const { organizationName, password, email } = values;
			await signUpApi({
				email,
				orgDisplayName: organizationName,
				password,
				token: params.get('token') || undefined,
			});

			const loginResponse = await loginApi({
				email,
				password,
			});

			const { data } = loginResponse;
			await afterLogin(data.userId, data.accessJwt, data.refreshJwt);
		} catch (error) {
			showErrorModal(error as APIError);
		}
	};

	const acceptInvite = async (values: FormValues): Promise<void> => {
		try {
			const { password, email } = values;
			await accept({
				password,
				token: params.get('token') || '',
			});
			const loginResponse = await loginApi({
				email,
				password,
			});
			const { data } = loginResponse;
			await afterLogin(data.userId, data.accessJwt, data.refreshJwt);
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
			});
		}
	};

	const handleSubmitSSO = async (): Promise<void> => {
		if (!params.get('token')) {
			notifications.error({
				message:
					'Invite token is required for signup, please request one from your admin',
			});
			return;
		}
		setLoading(true);
		try {
			const response = await accept({
				password: '',
				token: params.get('token') || '',
				sourceUrl: encodeURIComponent(window.location.href),
			});

			if (response.data?.sso) {
				if (response.data?.ssoUrl) {
					window.location.href = response.data?.ssoUrl;
				} else {
					notifications.error({
						message: 'Signup completed but failed to initiate login',
					});
					// take user to login page as there is nothing to do here
					history.push(ROUTES.LOGIN);
				}
			}
		} catch (error) {
			notifications.error({
				message: 'Something went wrong',
			});
		}

		setLoading(false);
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const handleSubmit = (): void => {
		(async (): Promise<void> => {
			try {
				const values = form.getFieldsValue();
				setLoading(true);

				if (!isPasswordValid(values.password)) {
					logEvent('Account Creation Page - Invalid Password', {
						email: values.email,
					});
					setIsPasswordPolicyError(true);
					setLoading(false);
					return;
				}

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
		if ('password' in changedValues || 'confirmPassword' in changedValues) {
			const { password, confirmPassword } = form.getFieldsValue();

			const isInvalidPassword = !isPasswordValid(password) && password.length > 0;
			setIsPasswordPolicyError(isInvalidPassword);

			const isSamePassword = password === confirmPassword;
			setConfirmPasswordError(!isSamePassword);
		}
	};

	const isValidForm: () => boolean = () => {
		const values = form.getFieldsValue();
		return (
			loading ||
			!values.email ||
			(!precheck.sso && (!values.password || !values.confirmPassword)) ||
			confirmPasswordError ||
			isPasswordPolicyError
		);
	};

	return (
		<div className="signup-page-container">
			<div className="perilin-bg" />
			<div className="signup-page-content">
				<div className="brand-container">
					<img
						src="/Logos/signoz-brand-logo.svg"
						alt="logo"
						className="brand-logo"
					/>

					<div className="brand-title">SigNoz</div>
				</div>

				<FormContainer
					onFinish={!precheck.sso ? handleSubmit : handleSubmitSSO}
					onValuesChange={handleValuesChange}
					form={form}
					className="signup-form"
				>
					<div className="signup-form-header">
						<Typography.Paragraph className="signup-form-header-text">
							You&apos;re almost in. Create a password to start monitoring your
							applications with SigNoz.
						</Typography.Paragraph>
					</div>

					<div className="email-container">
						<Label htmlFor="signupEmail">Email</Label>
						<FormContainer.Item noStyle name="email">
							<Input
								placeholder="name@yourcompany.com"
								type="email"
								autoFocus
								required
								id="signupEmail"
								disabled={isDetailsDisable}
							/>
						</FormContainer.Item>
					</div>

					{!precheck.sso && (
						<>
							<div className="password-container">
								<Label htmlFor="currentPassword">Password</Label>
								<FormContainer.Item noStyle name="password">
									<Input.Password required id="currentPassword" />
								</FormContainer.Item>
							</div>

							<div className="password-container">
								<Label htmlFor="confirmPassword">Confirm Password</Label>
								<FormContainer.Item noStyle name="confirmPassword">
									<Input.Password required id="confirmPassword" />
								</FormContainer.Item>
							</div>
						</>
					)}

					<div className="password-error-container">
						{confirmPasswordError && (
							<Typography.Paragraph
								id="password-confirm-error"
								className="password-error-message"
							>
								Passwords don’t match. Please try again
							</Typography.Paragraph>
						)}

						{isPasswordPolicyError && (
							<Typography.Paragraph className="password-error-message">
								{isPasswordNotValidMessage}
							</Typography.Paragraph>
						)}
					</div>

					{isSignUp && (
						<Typography.Paragraph className="signup-info-message">
							* This will create an admin account. If you are not an admin, please ask
							your admin for an invite link
						</Typography.Paragraph>
					)}

					<div className="signup-button-container">
						<Button
							type="primary"
							htmlType="submit"
							data-attr="signup"
							loading={loading}
							disabled={isValidForm()}
							className="periscope-btn primary next-btn"
							block
						>
							Access My Workspace
						</Button>
					</div>
				</FormContainer>
			</div>
		</div>
	);
}

export default SignUp;
