import { Button, Input, notification, Space, Tooltip, Typography } from 'antd';
import loginApi from 'api/user/login';
import loginPrecheckApi from 'api/user/loginPrecheck';
import afterLogin from 'AppRoutes/utils';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

function Login({
	jwt,
	refreshjwt,
	userId,
	ssoerror = '',
	withPassword = '0',
}: LoginProps): JSX.Element {
	const { t } = useTranslation(['login']);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [email, setEmail] = useState<string>('');
	const [password, setPassword] = useState<string>('');

	const [precheckResult, setPrecheckResult] = useState<PrecheckResultType>({
		sso: false,
		ssoUrl: '',
		canSelfRegister: false,
		isUser: true,
	});

	const [precheckInProcess, setPrecheckInProcess] = useState(false);
	const [precheckComplete, setPrecheckComplete] = useState(false);

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
				history.push(ROUTES.APPLICATION);
			}
		}
		processJwt();
	}, [jwt, refreshjwt, userId]);

	useEffect(() => {
		if (ssoerror !== '') {
			notification.error({
				message: t('failed_to_login'),
			});
		}
	}, [ssoerror, t]);

	const onNextHandler = async (): Promise<void> => {
		if (!email) {
			notification.error({
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
					notification.error({
						message: t('invalid_account'),
					});
				}
			} else {
				notification.error({
					message: t('invalid_config'),
				});
			}
		} catch (e) {
			console.log('failed to call precheck Api', e);
			notification.error({ message: t('unexpected_error') });
		}
		setPrecheckInProcess(false);
	};

	const onChangeHandler = (
		setFunc: React.Dispatch<React.SetStateAction<string>>,
		value: string,
	): void => {
		setFunc(value);
	};

	const { sso, canSelfRegister } = precheckResult;

	const onSubmitHandler: React.FormEventHandler<HTMLFormElement> = async (
		event,
	) => {
		try {
			event.preventDefault();
			event.persist();

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
				await afterLogin(
					response.payload.userId,
					response.payload.accessJwt,
					response.payload.refreshJwt,
				);
				history.push(ROUTES.APPLICATION);
			} else {
				notification.error({
					message: response.error || t('unexpected_error'),
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notification.error({
				message: t('unexpected_error'),
			});
		}
	};

	const renderSAMLAction = (): JSX.Element => {
		return (
			<Button
				type="primary"
				loading={isLoading}
				disabled={isLoading}
				href={precheckResult.ssoUrl}
			>
				{t('login_with_sso')}
			</Button>
		);
	};

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
			<FormContainer onSubmit={onSubmitHandler}>
				<Title level={4}>{t('login_page_title')}</Title>
				<ParentContainer>
					<Label htmlFor="signupEmail">{t('label_email')}</Label>
					<Input
						placeholder={t('placeholder_email')}
						type="email"
						autoFocus
						required
						id="loginEmail"
						onChange={(event): void => onChangeHandler(setEmail, event.target.value)}
						value={email}
						disabled={isLoading}
					/>
				</ParentContainer>
				{precheckComplete && !sso && (
					<ParentContainer>
						<Label htmlFor="Password">{t('label_password')}</Label>
						<Input.Password
							required
							id="currentPassword"
							onChange={(event): void =>
								onChangeHandler(setPassword, event.target.value)
							}
							disabled={isLoading}
							value={password}
						/>
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

					{!canSelfRegister && (
						<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
							{t('prompt_create_account')}{' '}
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
