import { useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/button';
import { Input } from '@signozhq/input';
import { Form, Select, Typography } from 'antd';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { useForgotPassword } from 'api/generated/services/users';
import { AxiosError } from 'axios';
import AuthError from 'components/AuthError/AuthError';
import ROUTES from 'constants/routes';
import { FormContainer, Label, ParentContainer } from 'container/Login/styles';
import history from 'lib/history';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';
import { OrgSessionContext } from 'types/api/v2/sessions/context/get';

import './ForgotPassword.styles.scss';
import 'container/Login/Login.styles.scss';

type FormValues = {
	email: string;
	orgId?: string;
};

export type ForgotPasswordRouteState = {
	email: string;
	orgId?: string;
	orgs: OrgSessionContext[];
};

function ForgotPassword({
	email,
	orgId,
	orgs,
}: ForgotPasswordRouteState): JSX.Element {
	const [form] = Form.useForm<FormValues>();
	const [errorMessage, setErrorMessage] = useState<APIError>();
	const [isSuccess, setIsSuccess] = useState(false);

	const { mutate: forgotPasswordMutate, isLoading } = useForgotPassword();

	const initialOrgId = useMemo((): string | undefined => {
		if (orgId) {
			return orgId;
		}

		if (orgs.length === 1) {
			return orgs[0]?.id;
		}

		return undefined;
	}, [orgId, orgs]);

	const watchedEmail = Form.useWatch('email', form);
	const selectedOrgId = Form.useWatch('orgId', form);

	useEffect(() => {
		form.setFieldsValue({
			email,
			orgId: initialOrgId,
		});
	}, [email, form, initialOrgId]);

	const hasMultipleOrgs = orgs.length > 1;

	const isSubmitEnabled = useMemo((): boolean => {
		if (isLoading) {
			return false;
		}

		if (!watchedEmail?.trim()) {
			return false;
		}

		return !(hasMultipleOrgs && !selectedOrgId);
	}, [watchedEmail, hasMultipleOrgs, selectedOrgId, isLoading]);

	const handleSubmit = (): void => {
		const values = form.getFieldsValue();

		// Clear any previous errors
		setErrorMessage(undefined);

		// Call the forgot password API
		forgotPasswordMutate(
			{
				data: {
					email: values.email,
					// Use initialOrgId as fallback when orgId field is hidden (single org)
					orgId: values.orgId || initialOrgId,
					frontendBaseURL: window.location.origin,
				},
			},
			{
				onSuccess: () => {
					setIsSuccess(true);
				},
				onError: (error) => {
					try {
						ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
					} catch (apiError) {
						setErrorMessage(apiError as APIError);
					}
				},
			},
		);
	};

	const handleBackToLogin = (): void => {
		history.push(ROUTES.LOGIN);
	};

	// Success screen
	if (isSuccess) {
		return (
			<div className="login-form-container">
				<div className="forgot-password-form">
					<div className="login-form-header">
						<div className="login-form-emoji">
							<Mail size={32} />
						</div>
						<Typography.Title level={4} className="login-form-title">
							Check your email
						</Typography.Title>
						<Typography.Paragraph className="login-form-description">
							We&apos;ve sent a password reset link to your email. Please check your
							inbox and follow the instructions to reset your password.
						</Typography.Paragraph>
					</div>

					<div className="login-form-actions forgot-password-actions">
						<Button
							variant="solid"
							color="primary"
							type="button"
							data-testid="back-to-login"
							className="login-submit-btn"
							onClick={handleBackToLogin}
							prefixIcon={<ArrowLeft size={12} />}
						>
							Back to login
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// Form screen
	return (
		<div className="login-form-container">
			<FormContainer
				form={form}
				onFinish={handleSubmit}
				className="forgot-password-form"
				initialValues={{
					email,
					orgId: initialOrgId,
				}}
			>
				<div className="login-form-header">
					<div className="login-form-emoji">
						<img src="/svgs/tv.svg" alt="TV" width="32" height="32" />
					</div>
					<Typography.Title level={4} className="login-form-title">
						Forgot your password?
					</Typography.Title>
					<Typography.Paragraph className="login-form-description">
						Send a reset link to your inbox and get back to monitoring.
					</Typography.Paragraph>
				</div>

				<div className="login-form-card">
					<ParentContainer>
						<Label htmlFor="forgotPasswordEmail">Email address</Label>
						<FormContainer.Item name="email">
							<Input
								type="email"
								id="forgotPasswordEmail"
								data-testid="email"
								required
								disabled
								className="login-form-input"
							/>
						</FormContainer.Item>
					</ParentContainer>

					{hasMultipleOrgs && (
						<ParentContainer>
							<Label htmlFor="orgId">Organization Name</Label>
							<FormContainer.Item name="orgId">
								<Select
									id="orgId"
									data-testid="orgId"
									className="login-form-input login-form-select-no-border"
									placeholder="Select your organization"
									options={orgs.map((org) => ({
										value: org.id,
										label: org.name || 'default',
									}))}
								/>
							</FormContainer.Item>
						</ParentContainer>
					)}
				</div>

				{errorMessage && <AuthError error={errorMessage} />}

				<div className="login-form-actions forgot-password-actions">
					<Button
						variant="solid"
						type="button"
						data-testid="forgot-password-back"
						className="forgot-password-back-button"
						onClick={handleBackToLogin}
						prefixIcon={<ArrowLeft size={12} />}
					>
						Back to login
					</Button>

					<Button
						disabled={!isSubmitEnabled}
						loading={isLoading}
						variant="solid"
						color="primary"
						type="submit"
						data-testid="forgot-password-submit"
						className="login-submit-btn"
						suffixIcon={<ArrowRight size={12} />}
					>
						{isLoading ? 'Sending...' : 'Send reset link'}
					</Button>
				</div>
			</FormContainer>
		</div>
	);
}

export default ForgotPassword;
