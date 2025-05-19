import { Button, Form, Input, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import accept from 'api/v1/invite/id/accept';
import getInviteDetails from 'api/v1/invite/id/get';
import loginApi from 'api/v1/login/login';
import signUpApi from 'api/v1/register/signup';
import afterLogin from 'AppRoutes/utils';
import WelcomeLeftContainer from 'components/WelcomeLeftContainer';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { InviteDetails } from 'types/api/user/getInviteDetails';
import { PayloadProps as LoginPrecheckPayloadProps } from 'types/api/user/loginPrecheck';

import { ButtonContainer, FormContainer, FormWrapper, Label } from './styles';
import { isPasswordNotValidMessage, isPasswordValid } from './utils';

const { Title } = Typography;

type FormValues = {
	firstName: string;
	email: string;
	organizationName: string;
	password: string;
	confirmPassword: string;
	hasOptedUpdates: boolean;
	isAnonymous: boolean;
};

function SignUp({ version }: SignUpProps): JSX.Element {
	const { t } = useTranslation(['signup']);
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

	const signUp = async (values: FormValues): Promise<void> => {
		try {
			const { organizationName, password, firstName, email } = values;
			const response = await signUpApi({
				email,
				name: firstName,
				orgDisplayName: organizationName,
				password,
				token: params.get('token') || undefined,
			});

			if (response.statusCode === 200) {
				const loginResponse = await loginApi({
					email,
					password,
				});

				const { data } = loginResponse;
				await afterLogin(data.userId, data.accessJwt, data.refreshJwt);
			}
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
			});
		}
	};

	const acceptInvite = async (values: FormValues): Promise<void> => {
		try {
			const { password, email, firstName } = values;
			await accept({
				password,
				token: params.get('token') || '',
				displayName: firstName,
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
				message: t('token_required'),
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
						message: t('failed_to_initiate_login'),
					});
					// take user to login page as there is nothing to do here
					history.push(ROUTES.LOGIN);
				}
			}
		} catch (error) {
			notifications.error({
				message: t('unexpected_error'),
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
						name: values.firstName,
					});
					setIsPasswordPolicyError(true);
					setLoading(false);
					return;
				}

				if (isSignUp) {
					await signUp(values);
					logEvent('Account Created Successfully', {
						email: values.email,
						name: values.firstName,
					});
				} else {
					await acceptInvite(values);
				}

				setLoading(false);
			} catch (error) {
				notifications.error({
					message: t('unexpected_error'),
				});
				setLoading(false);
			}
		})();
	};

	const getIsNameVisible = (): boolean =>
		!(form.getFieldValue('firstName') === 0 && !isSignUp);

	const isNameVisible = getIsNameVisible();

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
			(!isDetailsDisable && !values.firstName) ||
			confirmPasswordError ||
			isPasswordPolicyError
		);
	};

	return (
		<WelcomeLeftContainer version={version}>
			<FormWrapper>
				<FormContainer
					onFinish={!precheck.sso ? handleSubmit : handleSubmitSSO}
					onValuesChange={handleValuesChange}
					form={form}
				>
					<Title level={4}>Create your account</Title>
					<div>
						<Label htmlFor="signupEmail">{t('label_email')}</Label>
						<FormContainer.Item noStyle name="email">
							<Input
								placeholder={t('placeholder_email')}
								type="email"
								autoFocus
								required
								id="signupEmail"
								disabled={isDetailsDisable}
							/>
						</FormContainer.Item>
					</div>

					{isNameVisible && (
						<div>
							<Label htmlFor="signupFirstName">{t('label_firstname')}</Label>{' '}
							<FormContainer.Item noStyle name="firstName">
								<Input
									placeholder={t('placeholder_firstname')}
									required
									id="signupFirstName"
									disabled={isDetailsDisable && form.getFieldValue('firstName')}
								/>
							</FormContainer.Item>
						</div>
					)}

					<div>
						<Label htmlFor="organizationName">{t('label_orgname')}</Label>{' '}
						<FormContainer.Item noStyle name="organizationName">
							<Input
								placeholder={t('placeholder_orgname')}
								id="organizationName"
								disabled={isDetailsDisable}
							/>
						</FormContainer.Item>
					</div>
					{!precheck.sso && (
						<div>
							<Label htmlFor="Password">{t('label_password')}</Label>{' '}
							<FormContainer.Item noStyle name="password">
								<Input.Password required id="currentPassword" />
							</FormContainer.Item>
						</div>
					)}
					{!precheck.sso && (
						<div>
							<Label htmlFor="ConfirmPassword">{t('label_confirm_password')}</Label>{' '}
							<FormContainer.Item noStyle name="confirmPassword">
								<Input.Password required id="confirmPassword" />
							</FormContainer.Item>
							{confirmPasswordError && (
								<Typography.Paragraph
									italic
									id="password-confirm-error"
									style={{
										color: '#D89614',
										marginTop: '0.50rem',
									}}
								>
									{t('failed_confirm_password')}
								</Typography.Paragraph>
							)}
							{isPasswordPolicyError && (
								<Typography.Paragraph
									italic
									style={{
										color: '#D89614',
										marginTop: '0.50rem',
									}}
								>
									{isPasswordNotValidMessage}
								</Typography.Paragraph>
							)}
						</div>
					)}
					{isSignUp && (
						<Typography.Paragraph
							italic
							style={{
								color: '#D89614',
								marginTop: '0.50rem',
							}}
						>
							This will create an admin account. If you are not an admin, please ask
							your admin for an invite link
						</Typography.Paragraph>
					)}

					<ButtonContainer>
						<Button
							type="primary"
							htmlType="submit"
							data-attr="signup"
							loading={loading}
							disabled={isValidForm()}
						>
							{t('button_get_started')}
						</Button>
					</ButtonContainer>
				</FormContainer>
			</FormWrapper>
		</WelcomeLeftContainer>
	);
}

interface SignUpProps {
	version: string;
}

export default SignUp;
