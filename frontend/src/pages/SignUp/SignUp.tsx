import { Button, Form, Input, Space, Switch, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
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
import { PayloadProps as LoginPrecheckPayloadProps } from 'types/api/user/loginPrecheck';

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

	const getInviteDetailsResponse = useQuery({
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
			getInviteDetailsResponse.data.payload
		) {
			const responseDetails = getInviteDetailsResponse.data.payload;
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
		getInviteDetailsResponse.data?.payload,
		form,
		getInviteDetailsResponse.status,
	]);

	useEffect(() => {
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
		getInviteDetailsResponse.data,
		getInviteDetailsResponse.status,
		notifications,
	]);

	const isPreferenceVisible = token === null;

	const commonHandler = async (
		values: FormValues,
		isPreferenceVisible: boolean,
	): Promise<void> => {
		try {
			const { organizationName, password, firstName, email } = values;
			const response = await signUpApi({
				email,
				name: firstName,
				orgName: organizationName,
				password,
				token: params.get('token') || undefined,
				...(isPreferenceVisible
					? {
							isAnonymous: values.isAnonymous,
							hasOptedUpdates: values.hasOptedUpdates,
					  }
					: {}),
			});

			if (response.statusCode === 200) {
				const loginResponse = await loginApi({
					email,
					password,
				});

				if (loginResponse.statusCode === 200) {
					const { payload } = loginResponse;
					await afterLogin(payload.userId, payload.accessJwt, payload.refreshJwt);
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

	const handleSubmitSSO = async (): Promise<void> => {
		if (!params.get('token')) {
			notifications.error({
				message: t('token_required'),
			});
			return;
		}
		setLoading(true);

		try {
			const values = form.getFieldsValue();
			const response = await signUpApi({
				email: values.email,
				name: values.firstName,
				orgName: values.organizationName,
				password: values.password,
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

				if (isPreferenceVisible) {
					await commonHandler(values, true);
				} else {
					logEvent('Account Created Successfully', {
						email: values.email,
						name: values.firstName,
					});

					await commonHandler(values, false);
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
