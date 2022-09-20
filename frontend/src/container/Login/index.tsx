import { Button, Input, notification, Space, Tooltip, Typography } from 'antd';
import loginApi from 'api/user/login';
import loginPrecheckApi from 'api/user/loginPrecheck';
import afterLogin from 'AppRoutes/utils';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useEffect, useState } from 'react';
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
				message: 'sorry, failed to login',
			});
		}
	}, [ssoerror]);

	const onNextHandler = async (): Promise<void> => {
		if (!email) {
			notification.error({
				message: 'Please enter a valid email address',
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
						message:
							'This account does not exist. To create a new account, contact your admin to get an invite link',
					});
				}
			} else {
				notification.error({
					message:
						'Invalid configuration detected, please contact your administrator',
				});
			}
		} catch (e) {
			console.log('failed to call precheck Api', e);
			notification.error({ message: 'Sorry, something went wrong' });
		}
		setPrecheckInProcess(false);
	};

	const onChangeHandler = (
		setFunc: React.Dispatch<React.SetStateAction<string>>,
		value: string,
	): void => {
		setFunc(value);
	};

	const onSubmitHandler: React.FormEventHandler<HTMLFormElement> = async (
		event,
	) => {
		try {
			event.preventDefault();
			event.persist();
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
					message: response.error || 'Something went wrong',
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notification.error({
				message: 'Something went wrong',
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
				Login with SSO
			</Button>
		);
	};

	const renderOnSsoError = (): JSX.Element | null => {
		if (!ssoerror) {
			return null;
		}

		return (
			<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
				Are you trying to resolve SSO configuration issue?{' '}
				<a href="/login?password=Y">login with password</a>.
			</Typography.Paragraph>
		);
	};

	const { sso, canSelfRegister } = precheckResult;
	return (
		<FormWrapper>
			<FormContainer onSubmit={onSubmitHandler}>
				<Title level={4}>Login to SigNoz</Title>
				<ParentContainer>
					<Label htmlFor="signupEmail">Email</Label>
					<Input
						placeholder="name@yourcompany.com"
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
						<Label htmlFor="Password">Password</Label>
						<Input.Password
							required
							id="currentPassword"
							onChange={(event): void =>
								onChangeHandler(setPassword, event.target.value)
							}
							disabled={isLoading}
							value={password}
						/>
						<Tooltip title="Ask your admin to reset your password and send you a new invite link">
							<Typography.Link>Forgot password?</Typography.Link>
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
							Next
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
							Login
						</Button>
					)}

					{precheckComplete && sso && renderSAMLAction()}
					{!precheckComplete && ssoerror && renderOnSsoError()}

					{!canSelfRegister && (
						<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
							Don&#39;t have an account? Contact your admin to send you an invite link.
						</Typography.Paragraph>
					)}

					{!canSelfRegister && (
						<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
							If you are setting up SigNoz for the first time,{' '}
							<Typography.Link
								onClick={(): void => {
									history.push(ROUTES.SIGN_UP);
								}}
								style={{ fontWeight: 700 }}
							>
								Create an account
							</Typography.Link>
						</Typography.Paragraph>
					)}

					{canSelfRegister && (
						<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
							If you are admin,{' '}
							<Typography.Link
								onClick={(): void => {
									history.push(ROUTES.SIGN_UP);
								}}
								style={{ fontWeight: 700 }}
							>
								Create an account
							</Typography.Link>
						</Typography.Paragraph>
					)}
				</Space>
			</FormContainer>
		</FormWrapper>
	);
}

export default Login;
