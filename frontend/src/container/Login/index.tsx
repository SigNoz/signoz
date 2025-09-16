import './Login.styles.scss';

import { Button, Form, Input, Space, Tooltip, Typography } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import loginApi from 'api/v1/login/login';
import loginPrecheckApi from 'api/v1/login/loginPrecheck';
import getUserVersion from 'api/v1/version/getVersion';
import afterLogin from 'AppRoutes/utils';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { ArrowRight } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import APIError from 'types/api/error';
import { Signup as PrecheckResultType } from 'types/api/user/loginPrecheck';

import { FormContainer, Label, ParentContainer } from './styles';

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
				message: 'sorry, failed to login',
			});
		}
	}, [ssoerror, notifications]);

	const onNextHandler = async (): Promise<void> => {
		const email = form.getFieldValue('email');
		if (!email) {
			notifications.error({
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
					notifications.error({
						message:
							'This account does not exist. To create a new account, contact your admin to get an invite link',
					});
				}
			} else {
				notifications.error({
					message:
						'Invalid configuration detected, please contact your administrator',
				});
			}
		} catch (e) {
			console.log('failed to call precheck Api', e);
			notifications.error({ message: 'Sorry, something went wrong' });
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

			afterLogin(
				response.data.userId,
				response.data.accessJwt,
				response.data.refreshJwt,
			);
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
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
			Login with SSO
		</Button>
	);

	const renderOnSsoError = (): JSX.Element | null => {
		if (!ssoerror) {
			return null;
		}

		return (
			<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
				Are you trying to resolve SSO configuration issue?{' '}
				<a href="/login?password=Y">Login with password</a>.
			</Typography.Paragraph>
		);
	};

	return (
		<div className="login-form-container">
			<FormContainer form={form} onFinish={onSubmitHandler}>
				<div className="login-form-header">
					<Typography.Paragraph className="login-form-header-text">
						Sign in to monitor, trace, and troubleshoot your applications
						effortlessly.
					</Typography.Paragraph>
				</div>

				<ParentContainer>
					<Label htmlFor="signupEmail" style={{ marginTop: 0 }}>
						Email
					</Label>
					<FormContainer.Item name="email">
						<Input
							type="email"
							id="loginEmail"
							data-testid="email"
							required
							placeholder="name@yourcompany.com"
							autoFocus
							disabled={isLoading}
							className="login-form-input"
						/>
					</FormContainer.Item>
				</ParentContainer>
				{precheckComplete && !sso && (
					<ParentContainer>
						<Label htmlFor="Password">Password</Label>
						<FormContainer.Item name="password">
							<Input.Password
								required
								id="currentPassword"
								data-testid="password"
								disabled={isLoading}
								className="login-form-input"
							/>
						</FormContainer.Item>

						<div style={{ marginTop: 8 }}>
							<Tooltip title="Ask your admin to reset your password and send you a new invite link">
								<Typography.Link>Forgot password?</Typography.Link>
							</Tooltip>
						</div>
					</ParentContainer>
				)}
				<Space
					style={{ marginTop: 16 }}
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
							className="periscope-btn primary next-btn"
							icon={<ArrowRight size={12} />}
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
							className="periscope-btn primary next-btn"
							icon={<ArrowRight size={12} />}
						>
							Login
						</Button>
					)}

					{precheckComplete && sso && renderSAMLAction()}
					{!precheckComplete && ssoerror && renderOnSsoError()}

					{!canSelfRegister && (
						<Typography.Paragraph className="no-acccount">
							Don&apos;t have an account? Contact your admin to send you an invite
							link.
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
		</div>
	);
}

export default Login;
