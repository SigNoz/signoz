import { Button, Form, Input, Space, Tooltip, Typography } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import getUserVersion from 'api/user/getVersion';
import loginApi from 'api/user/login';
import loginPrecheckApi from 'api/user/loginPrecheck';
import afterLogin from 'AppRoutes/utils';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { PayloadProps as PrecheckResultType } from 'types/api/user/loginPrecheck';

import { FormContainer, FormWrapper, Label, ParentContainer } from './styles';

const { Title } = Typography;

interface LoginProps {
	jwt: string;
	refreshjwt: string;
	userId: string;
	ssoerror: string;
	withPassword: string;
}

type FormValues = { email: string; password: string };

function Login({
	jwt,
	refreshjwt,
	userId,
	ssoerror = '',
	withPassword = '0',
}: LoginProps): JSX.Element {
	const { t } = useTranslation(['login']);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { user } = useAppContext();

	const [precheckResult, setPrecheckResult] = useState<PrecheckResultType>({
		sso: false,
		ssoUrl: '',
		canSelfRegister: false,
		isUser: true,
	});

	const [precheckInProcess, setPrecheckInProcess] = useState(false);
	const [precheckComplete, setPrecheckComplete] = useState(false);

	const { notifications } = useNotifications();

	const getUserVersionResponse = useQuery({
		queryFn: getUserVersion,
		queryKey: ['getUserVersion', user?.accessJwt],
		enabled: true,
	});

	useEffect(() => {
		if (
			getUserVersionResponse.isFetched &&
			getUserVersionResponse.data &&
			getUserVersionResponse.data.payload
		) {
			const { setupCompleted } = getUserVersionResponse.data.payload;
			if (!setupCompleted) {
				// no org account registered yet, re-route user to sign up first
				history.push(ROUTES.SIGN_UP);
			}
		}
	}, [getUserVersionResponse]);

	const [form] = Form.useForm<FormValues>();

	useEffect(() => {
		if (withPassword === 'Y') {
			setPrecheckComplete(true);
		}
	}, [withPassword]);

	useEffect(() => {
		async function processJwt(): Promise<void> {
			if (jwt && jwt !== '') {
				setIsLoading(true);
				await afterLogin(userId, jwt, refreshjwt);
				setIsLoading(false);
				const fromPathname = getLocalStorageApi(
					LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT,
				);
				if (fromPathname) {
					history.push(fromPathname);
					setLocalStorageApi(LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT, '');
				} else {
					history.push(ROUTES.APPLICATION);
				}
			}
		}
		processJwt();
	}, [jwt, refreshjwt, userId]);

	useEffect(() => {
		if (ssoerror !== '') {
			notifications.error({
				message: t('failed_to_login'),
			});
		}
	}, [ssoerror, t, notifications]);

	const onNextHandler = async (): Promise<void> => {
		const email = form.getFieldValue('email');
		if (!email) {
			notifications.error({
				message: t('invalid_email'),
			});
			return;
		}
		setPrecheckInProcess(true);
		try {
			const response = await loginPrecheckApi({
				email,
			});

			if (response.statusCode === 200) {
				setPrecheckResult({ ...precheckResult, ...response.payload });

				const { isUser } = response.payload;
				if (isUser) {
					setPrecheckComplete(true);
				} else {
					notifications.error({
						message: t('invalid_account'),
					});
				}
			} else {
				notifications.error({
					message: t('invalid_config'),
				});
			}
		} catch (e) {
			console.log('failed to call precheck Api', e);
			notifications.error({ message: t('unexpected_error') });
		}
		setPrecheckInProcess(false);
	};

	const { sso, canSelfRegister } = precheckResult;

	const onSubmitHandler: () => Promise<void> = async () => {
		try {
			const { email, password } = form.getFieldsValue();
			if (!precheckComplete) {
				onNextHandler();
				return;
			}

			if (precheckComplete && sso) {
				window.location.href = precheckResult.ssoUrl || '';
				return;
			}

			setIsLoading(true);

			const response = await loginApi({
				email,
				password,
			});
			if (response.statusCode === 200) {
				afterLogin(
					response.payload.userId,
					response.payload.accessJwt,
					response.payload.refreshJwt,
				);
			} else {
				notifications.error({
					message: response.error || t('unexpected_error'),
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notifications.error({
				message: t('unexpected_error'),
			});
		}
	};

	const renderSAMLAction = (): JSX.Element => (
		<Button
			type="primary"
			loading={isLoading}
			disabled={isLoading}
			href={precheckResult.ssoUrl}
		>
			{t('login_with_sso')}
		</Button>
	);

	const renderOnSsoError = (): JSX.Element | null => {
		if (!ssoerror) {
			return null;
		}

		return (
			<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
				{t('prompt_on_sso_error')}{' '}
				<a href="/login?password=Y">{t('login_with_pwd')}</a>.
			</Typography.Paragraph>
		);
	};

	return (
		<FormWrapper>
			<FormContainer form={form} onFinish={onSubmitHandler}>
				<Title level={4}>{t('login_page_title')}</Title>
				<ParentContainer>
					<Label htmlFor="signupEmail">{t('label_email')}</Label>
					<FormContainer.Item name="email">
						<Input
							type="email"
							id="loginEmail"
							data-testid="email"
							required
							placeholder={t('placeholder_email')}
							autoFocus
							disabled={isLoading}
						/>
					</FormContainer.Item>
				</ParentContainer>
				{precheckComplete && !sso && (
					<ParentContainer>
						<Label htmlFor="Password">{t('label_password')}</Label>
						<FormContainer.Item name="password">
							<Input.Password
								required
								id="currentPassword"
								data-testid="password"
								disabled={isLoading}
							/>
						</FormContainer.Item>
						<Tooltip title={t('prompt_forgot_password')}>
							<Typography.Link>{t('forgot_password')}</Typography.Link>
						</Tooltip>
					</ParentContainer>
				)}
				<Space
					style={{ marginTop: '1.3125rem' }}
					align="start"
					direction="vertical"
					size={20}
				>
					{!precheckComplete && (
						<Button
							disabled={precheckInProcess}
							loading={precheckInProcess}
							type="primary"
							onClick={onNextHandler}
							data-testid="initiate_login"
						>
							{t('button_initiate_login')}
						</Button>
					)}
					{precheckComplete && !sso && (
						<Button
							disabled={isLoading}
							loading={isLoading}
							type="primary"
							htmlType="submit"
							data-attr="signup"
						>
							{t('button_login')}
						</Button>
					)}

					{precheckComplete && sso && renderSAMLAction()}
					{!precheckComplete && ssoerror && renderOnSsoError()}

					{!canSelfRegister && (
						<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
							{t('prompt_no_account')}
						</Typography.Paragraph>
					)}

					{canSelfRegister && (
						<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
							{t('prompt_if_admin')}{' '}
							<Typography.Link
								onClick={(): void => {
									history.push(ROUTES.SIGN_UP);
								}}
								style={{ fontWeight: 700 }}
							>
								{t('create_an_account')}
							</Typography.Link>
						</Typography.Paragraph>
					)}
				</Space>
			</FormContainer>
		</FormWrapper>
	);
}

export default Login;
