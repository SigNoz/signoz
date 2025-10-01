import './Login.styles.scss';

import { Button, Form, Input, Select, Space, Tooltip, Typography } from 'antd';
import getVersion from 'api/v1/version/get';
import get from 'api/v2/sessions/context/get';
import post from 'api/v2/sessions/email_password/post';
import afterLogin from 'AppRoutes/utils';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { ArrowRight } from 'lucide-react';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import APIError from 'types/api/error';
import { SessionsContext } from 'types/api/v2/sessions/context/get';

import { FormContainer, Label, ParentContainer } from './styles';

type FormValues = {
	email: string;
	password: string;
	orgId: string;
	url: string;
};

function Login(): JSX.Element {
	const urlQueryParams = useUrlQuery();
	const accessToken = urlQueryParams.get('accessToken') || '';
	const refreshToken = urlQueryParams.get('refreshToken') || '';
	// const callbackAuthError = urlQueryParams.get('callbackauthnerr') || '';

	const [sessionsContext, setSessionsContext] = useState<SessionsContext>();
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [form] = Form.useForm<FormValues>();
	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();
	const sessionsOrgId = Form.useWatch('orgId', form);

	// setupCompleted information to route to signup page in case setup is incomplete
	const {
		data: versionData,
		isLoading: versionLoading,
		error: versionError,
	} = useQuery({
		queryFn: getVersion,
		queryKey: ['api/v1/version/get'],
		enabled: true,
	});

	// in case of error do not route to signup page as it may lead to double registration
	useEffect(() => {
		if (
			versionData &&
			!versionLoading &&
			!versionError &&
			!versionData.data.setupCompleted
		) {
			history.push(ROUTES.SIGN_UP);
		}
	}, [versionData, versionLoading, versionError]);

	// fetch the sessions context post user entering the email
	const onNextHandler = async (): Promise<void> => {
		const email = form.getFieldValue('email');
		if (!email) {
			notifications.error({
				message: 'Please enter a valid email address',
			});
			return;
		}

		try {
			const sessionsContextResponse = await get({
				email,
				ref: window.location.href,
			});

			if (!sessionsContextResponse.data.exists) {
				showErrorModal(
					new APIError({
						httpStatusCode: 404,
						error: {
							code: 'invalid_input',
							message: "user doesn't exist",
							url: '',
							errors: [],
						},
					}),
				);
			}

			setSessionsContext(sessionsContextResponse.data);
		} catch (error) {
			showErrorModal(error as APIError);
		}
	};

	// post selection of email and session org decide on the authN mechanism to use
	const isPasswordAuthN = useMemo((): boolean => {
		if (!sessionsContext) {
			return false;
		}

		if (!sessionsOrgId) {
			return false;
		}

		let isPasswordAuthN = false;
		sessionsContext.orgs.forEach((orgSession) => {
			if (
				orgSession.id === sessionsOrgId &&
				orgSession.authNSupport.password.length > 0
			) {
				isPasswordAuthN = true;
			}
		});

		return isPasswordAuthN;
	}, [sessionsOrgId, sessionsContext]);

	const isCallbackAuthN = useMemo((): boolean => {
		if (!sessionsContext) {
			return false;
		}

		if (!sessionsOrgId) {
			return false;
		}

		let isCallbackAuthN = false;
		sessionsContext.orgs.forEach((orgSession) => {
			if (
				orgSession.id === sessionsOrgId &&
				orgSession.authNSupport?.callback?.length > 0
			) {
				isCallbackAuthN = true;
				form.setFieldValue('url', orgSession.authNSupport.callback[0].url);
			}
		});

		return isCallbackAuthN;
	}, [sessionsContext, sessionsOrgId, form]);

	useEffect(() => {
		if (accessToken && refreshToken) {
			afterLogin(accessToken, refreshToken);
		}
	}, [accessToken, refreshToken]);

	const onSubmitHandler: () => Promise<void> = async () => {
		setIsSubmitting(true);

		try {
			if (isPasswordAuthN) {
				const email = form.getFieldValue('email');
				const orgId = form.getFieldValue('orgId');

				const password = form.getFieldValue('password');
				if (password === '') {
					return;
				}

				const createSessionEmailPasswordResponse = await post({
					email,
					password,
					orgId,
				});

				afterLogin(
					createSessionEmailPasswordResponse.data.accessToken,
					createSessionEmailPasswordResponse.data.refreshToken,
				);
			}
			if (isCallbackAuthN) {
				const url = form.getFieldValue('url');
				if (!url) {
					return;
				}

				window.location.href = url;
			}
		} catch (error) {
			showErrorModal(error as APIError);
		} finally {
			setIsSubmitting(false);
		}
	};

	// useEffect(() => {
	// 	if (callbackAuthError) {

	// 	}
	// }, [callbackAuthError]);

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
							id="email"
							data-testid="email"
							required
							placeholder="name@yourcompany.com"
							autoFocus
							disabled={versionLoading}
							className="login-form-input"
						/>
					</FormContainer.Item>
				</ParentContainer>

				{sessionsContext && (
					<ParentContainer>
						<Label htmlFor="orgId">Organization Name</Label>
						<FormContainer.Item name="orgId">
							<Select
								id="orgId"
								data-testid="orgId"
								className="login-form-input"
								placeholder="Select your organization"
								options={sessionsContext.orgs.map((org) => ({
									value: org.id,
									label: org.name || 'default',
								}))}
								onChange={(value: string): void => {
									form.setFieldsValue({ orgId: value });
								}}
							/>
						</FormContainer.Item>
					</ParentContainer>
				)}

				{sessionsContext && isPasswordAuthN && (
					<ParentContainer>
						<Label htmlFor="Password">Password</Label>
						<FormContainer.Item name="password">
							<Input.Password
								required
								id="currentPassword"
								data-testid="password"
								disabled={isSubmitting}
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
					{!sessionsContext && (
						<Button
							disabled={versionLoading}
							type="primary"
							onClick={onNextHandler}
							data-testid="initiate_login"
							className="periscope-btn primary next-btn"
							icon={<ArrowRight size={12} />}
						>
							Next
						</Button>
					)}

					{sessionsContext && isCallbackAuthN && (
						<Button
							disabled={isSubmitting}
							type="primary"
							htmlType="submit"
							data-attr="signup"
							className="periscope-btn primary next-btn"
							icon={<ArrowRight size={12} />}
						>
							Login With Callback
						</Button>
					)}

					{sessionsContext && isPasswordAuthN && (
						<Button
							disabled={isSubmitting}
							type="primary"
							htmlType="submit"
							data-attr="signup"
							className="periscope-btn primary next-btn"
							icon={<ArrowRight size={12} />}
						>
							Login
						</Button>
					)}

					{/* {precheckComplete && sso && renderSAMLAction()}
					{!precheckComplete && ssoerror && renderOnSsoError()} */}
				</Space>
			</FormContainer>
		</div>
	);
}

export default Login;
