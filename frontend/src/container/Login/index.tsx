import './Login.styles.scss';

import { Button, Form, Input, Select, Space, Tooltip, Typography } from 'antd';
import getVersion from 'api/v1/version/get';
import get from 'api/v2/sessions/context/get';
import post from 'api/v2/sessions/email_password/post';
import afterLogin from 'AppRoutes/utils';
import ROUTES from 'constants/routes';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { ArrowRight } from 'lucide-react';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { ErrorV2 } from 'types/api';
import APIError from 'types/api/error';
import { SessionsContext } from 'types/api/v2/sessions/context/get';

import { FormContainer, Label, ParentContainer } from './styles';

function parseErrors(errors: string): { message: string }[] {
	try {
		const parsedErrors = JSON.parse(errors);
		return parsedErrors.map((error: { message: string }) => ({
			message: error.message,
		}));
	} catch (e) {
		console.error('Failed to parse errors:', e);
		return [];
	}
}

type FormValues = {
	email: string;
	password: string;
	orgId: string;
	url: string;
};

function Login(): JSX.Element {
	const urlQueryParams = useUrlQuery();
	// override for callbackAuthN in case of some misconfiguration
	const isPasswordAuthNEnabled = (urlQueryParams.get('password') || 'N') === 'Y';

	// callbackAuthN handling
	const accessToken = urlQueryParams.get('accessToken') || '';
	const refreshToken = urlQueryParams.get('refreshToken') || '';

	// callbackAuthN error handling
	const callbackAuthError = urlQueryParams.get('callbackauthnerr') || '';
	const callbackAuthErrorCode = urlQueryParams.get('code') || '';
	const callbackAuthErrorMessage = urlQueryParams.get('message') || '';
	const callbackAuthErrorURL = urlQueryParams.get('url') || '';
	const callbackAuthErrorAdditional = urlQueryParams.get('errors') || '';

	const [sessionsContext, setSessionsContext] = useState<SessionsContext>();
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [sessionsOrgId, setSessionsOrgId] = useState<string>('');
	const [
		sessionsContextLoading,
		setIsLoadingSessionsContext,
	] = useState<boolean>(false);
	const [form] = Form.useForm<FormValues>();
	const { showErrorModal } = useErrorModal();

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
		setIsLoadingSessionsContext(true);

		try {
			const sessionsContextResponse = await get({
				email,
				ref: window.location.href,
			});

			setSessionsContext(sessionsContextResponse.data);
			if (sessionsContextResponse.data.orgs.length === 1) {
				setSessionsOrgId(sessionsContextResponse.data.orgs[0].id);
			}
		} catch (error) {
			showErrorModal(error as APIError);
		}
		setIsLoadingSessionsContext(false);
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
				orgSession.authNSupport?.password?.length > 0
			) {
				isPasswordAuthN = true;
			}
		});

		return isPasswordAuthN || isPasswordAuthNEnabled;
	}, [sessionsContext, sessionsOrgId, isPasswordAuthNEnabled]);

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

		return isCallbackAuthN && !isPasswordAuthNEnabled;
	}, [sessionsContext, sessionsOrgId, isPasswordAuthNEnabled, form]);

	const sessionsOrgWarning = useMemo((): ErrorV2 | null => {
		if (!sessionsContext) {
			return null;
		}

		if (!sessionsOrgId) {
			return null;
		}

		let sessionsOrgWarning;
		sessionsContext.orgs.forEach((orgSession) => {
			if (orgSession.id === sessionsOrgId && orgSession.warning) {
				sessionsOrgWarning = orgSession.warning;
			}
		});

		return sessionsOrgWarning || null;
	}, [sessionsContext, sessionsOrgId]);

	// once the callback authN redirects to the login screen with access_token and refresh_token navigate them to homepage
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

				const password = form.getFieldValue('password');

				const createSessionEmailPasswordResponse = await post({
					email,
					password,
					orgId: sessionsOrgId,
				});

				afterLogin(
					createSessionEmailPasswordResponse.data.accessToken,
					createSessionEmailPasswordResponse.data.refreshToken,
				);
			}
			if (isCallbackAuthN) {
				const url = form.getFieldValue('url');

				window.location.href = url;
			}
		} catch (error) {
			showErrorModal(error as APIError);
		} finally {
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		if (callbackAuthError) {
			showErrorModal(
				new APIError({
					httpStatusCode: 500,
					error: {
						code: callbackAuthErrorCode,
						message: callbackAuthErrorMessage,
						url: callbackAuthErrorURL,
						errors: parseErrors(callbackAuthErrorAdditional),
					},
				}),
			);
		}
	}, [
		callbackAuthError,
		callbackAuthErrorAdditional,
		callbackAuthErrorCode,
		callbackAuthErrorMessage,
		callbackAuthErrorURL,
		showErrorModal,
	]);

	useEffect(() => {
		if (sessionsOrgWarning) {
			showErrorModal(
				new APIError({
					error: {
						code: sessionsOrgWarning.code,
						message: sessionsOrgWarning.message,
						url: sessionsOrgWarning.url,
						errors: sessionsOrgWarning.errors,
					},
					httpStatusCode: 400,
				}),
			);
		}
	}, [sessionsOrgWarning, showErrorModal]);

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
							onPressEnter={onNextHandler}
						/>
					</FormContainer.Item>
				</ParentContainer>

				{sessionsContext && sessionsContext.orgs.length > 1 && (
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
									setSessionsOrgId(value);
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
							disabled={versionLoading || sessionsContextLoading}
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
							data-testid="callback_authn_submit"
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
							data-testid="password_authn_submit"
							htmlType="submit"
							data-attr="signup"
							className="periscope-btn primary next-btn"
							icon={<ArrowRight size={12} />}
						>
							Login
						</Button>
					)}
				</Space>
			</FormContainer>
		</div>
	);
}

export default Login;
