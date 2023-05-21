import { Button, Form, Input, Space, Switch, Typography } from 'antd';
import editOrg from 'api/user/editOrg';
import getInviteDetails from 'api/user/getInviteDetails';
import loginApi from 'api/user/login';
import signUpApi from 'api/user/signup';
import afterLogin from 'AppRoutes/utils';
import WelcomeLeftContainer from 'components/WelcomeLeftContainer';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/user/getUser';
import * as loginPrecheck from 'types/api/user/loginPrecheck';

import {
	ButtonContainer,
	FormContainer,
	FormWrapper,
	Label,
	MarginTop,
} from './styles';
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
	const { search } = useLocation();
	const { notifications } = useNotifications();
	const { t } = useTranslation(['signup']);
	const params = new URLSearchParams(search);
	const token = params.get('token');

	const [form] = Form.useForm<FormValues>();
	const email = Form.useWatch('email', form);
	const firstName = Form.useWatch('firstName', form);
	const organizationName = Form.useWatch('organizationName', form);
	const password = Form.useWatch('password', form);
	const confirmPassword = Form.useWatch('confirmPassword', form);
	const isAnonymous = Form.useWatch('isAnonymous', form);
	const hasOptedUpdates = Form.useWatch('hasOptedUpdates', form);

	const [loading, setLoading] = useState(false);
	const [precheck, setPrecheck] = useState<loginPrecheck.PayloadProps>({
		sso: false,
		isUser: false,
	});
	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);
	const [isPasswordPolicyError, setIsPasswordPolicyError] = useState<boolean>(
		false,
	);
	const [isDetailsDisable, setIsDetailsDisable] = useState<boolean>(false);

	const getInviteDetailsResponse = useQuery({
		queryFn: () =>
			getInviteDetails({
				inviteId: token || '',
			}),
		queryKey: ['getInviteDetails', token],
		enabled: token !== null,
	});

	useEffect(() => {
		if (
			getInviteDetailsResponse.status === 'success' &&
			getInviteDetailsResponse.data.payload
		) {
			const responseDetails = getInviteDetailsResponse.data.payload;
			if (responseDetails.precheck) setPrecheck(responseDetails.precheck);
			form.setFieldValue('firstName', responseDetails.name);
			form.setFieldValue('email', responseDetails.email);
			form.setFieldValue('organizationName', responseDetails.organization);
			setIsDetailsDisable(true);
		}
		if (
			getInviteDetailsResponse.status === 'success' &&
			getInviteDetailsResponse.data?.error
		) {
			const { error } = getInviteDetailsResponse.data;
			notifications.error({
				message: error,
			});
		}
	}, [
		getInviteDetailsResponse.data?.payload,
		getInviteDetailsResponse.data?.error,
		getInviteDetailsResponse.status,
		getInviteDetailsResponse,
		notifications,
		form,
	]);

	useEffect(() => {
		const isInvalidPassword = !isPasswordValid(password) && password.length > 0;
		setIsPasswordPolicyError(isInvalidPassword);

		const isSamePassword = password === confirmPassword;
		setConfirmPasswordError(!isSamePassword);
	}, [password, confirmPassword]);

	const isPreferenceVisible = token === null;

	const commonHandler = async (
		callback: (e: SuccessResponse<PayloadProps>) => Promise<void> | VoidFunction,
	): Promise<void> => {
		try {
			const response = await signUpApi({
				email,
				name: firstName,
				orgName: organizationName,
				password,
				token: params.get('token') || undefined,
			});

			if (response.statusCode === 200) {
				const loginResponse = await loginApi({
					email,
					password,
				});

				if (loginResponse.statusCode === 200) {
					const { payload } = loginResponse;
					const userResponse = await afterLogin(
						payload.userId,
						payload.accessJwt,
						payload.refreshJwt,
					);
					if (userResponse) {
						callback(userResponse);
					}
				} else {
					notifications.error({
						message: loginResponse.error || t('unexpected_error'),
					});
				}
			} else {
				notifications.error({
					message: response.error || t('unexpected_error'),
				});
			}
		} catch (error) {
			notifications.error({
				message: t('unexpected_error'),
			});
		}
	};

	const onAdminAfterLogin = async (
		userResponse: SuccessResponse<PayloadProps>,
	): Promise<void> => {
		const editResponse = await editOrg({
			isAnonymous,
			name: organizationName,
			hasOptedUpdates,
			orgId: userResponse.payload.orgId,
		});
		if (editResponse.statusCode === 200) {
			history.push(ROUTES.APPLICATION);
		} else {
			notifications.error({
				message: editResponse.error || t('unexpected_error'),
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
			const response = await signUpApi({
				email,
				name: firstName,
				orgName: organizationName,
				password,
				token: params.get('token') || undefined,
				sourceUrl: encodeURIComponent(window.location.href),
			});

			if (response.statusCode === 200) {
				if (response.payload?.sso) {
					if (response.payload?.ssoUrl) {
						window.location.href = response.payload?.ssoUrl;
					} else {
						notifications.error({
							message: t('failed_to_initiate_login'),
						});
						// take user to login page as there is nothing to do here
						history.push(ROUTES.LOGIN);
					}
				}
			} else {
				notifications.error({
					message: response.error || t('unexpected_error'),
				});
			}
		} catch (error) {
			notifications.error({
				message: t('unexpected_error'),
			});
		}

		setLoading(false);
	};

	const handleSubmit = (): void => {
		(async (): Promise<void> => {
			try {
				setLoading(true);

				if (!isPasswordValid(password)) {
					setIsPasswordPolicyError(true);
					setLoading(false);
					return;
				}

				if (isPreferenceVisible) {
					await commonHandler(onAdminAfterLogin);
				} else {
					await commonHandler(
						async (): Promise<void> => {
							history.push(ROUTES.APPLICATION);
						},
					);
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
		!(form.getFieldValue('firstName') === 0 && !isPreferenceVisible);

	const isNameVisible = getIsNameVisible();

	const isValidForm: () => boolean = () =>
		loading ||
		!email ||
		!organizationName ||
		(!precheck.sso && (!password || !confirmPassword)) ||
		(!isDetailsDisable && !firstName) ||
		confirmPasswordError ||
		isPasswordPolicyError;

	return (
		<WelcomeLeftContainer version={version}>
			<FormWrapper>
				<FormContainer
					onFinish={!precheck.sso ? handleSubmit : handleSubmitSSO}
					initialValues={{ hasOptedUpdates: true, isAnonymous: false }}
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
									disabled={isDetailsDisable}
								/>
							</FormContainer.Item>
						</div>
					)}

					<div>
						<Label htmlFor="organizationName">{t('label_orgname')}</Label>{' '}
						<FormContainer.Item noStyle name="organizationName">
							<Input
								placeholder={t('placeholder_orgname')}
								required
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

					{isPreferenceVisible && (
						<>
							<MarginTop marginTop="2.4375rem">
								<Space>
									<FormContainer.Item
										noStyle
										name="hasOptedUpdates"
										valuePropName="checked"
									>
										<Switch />
									</FormContainer.Item>

									<Typography>{t('prompt_keepme_posted')} </Typography>
								</Space>
							</MarginTop>

							<MarginTop marginTop="0.5rem">
								<Space>
									<FormContainer.Item noStyle name="isAnonymous" valuePropName="checked">
										<Switch />
									</FormContainer.Item>
									<Typography>{t('prompt_anonymise')}</Typography>
								</Space>
							</MarginTop>
						</>
					)}

					{isPreferenceVisible && (
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
