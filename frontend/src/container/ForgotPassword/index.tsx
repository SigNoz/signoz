import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@signozhq/button';
import { ArrowLeft, ArrowRight } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { Form, Select } from 'antd';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { useForgotPassword } from 'api/generated/services/users';
import { AxiosError } from 'axios';
import AuthError from 'components/AuthError/AuthError';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';
import { OrgSessionContext } from 'types/api/v2/sessions/context/get';

import SuccessScreen from './SuccessScreen';

import './ForgotPassword.styles.scss';
import 'container/Login/Login.styles.scss';

type FormValues = {
	email: string;
	orgId: string;
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
	const {
		mutate: forgotPasswordMutate,
		isLoading,
		isSuccess,
		error: mutationError,
	} = useForgotPassword();

	const errorMessage = useMemo(() => {
		if (!mutationError) {
			return undefined;
		}

		try {
			ErrorResponseHandlerV2(mutationError as AxiosError<ErrorV2Resp>);
		} catch (apiError) {
			return apiError as APIError;
		}
	}, [mutationError]);

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

		// Ensure we have an orgId (either selected from dropdown or the initial one)
		const currentOrgId = hasMultipleOrgs ? selectedOrgId : initialOrgId;
		return Boolean(currentOrgId);
	}, [watchedEmail, selectedOrgId, isLoading, initialOrgId, hasMultipleOrgs]);

	const handleSubmit = useCallback((): void => {
		const values = form.getFieldsValue();
		const currentOrgId = hasMultipleOrgs ? values.orgId : initialOrgId;

		if (!currentOrgId) {
			return;
		}

		// Call the forgot password API
		forgotPasswordMutate({
			data: {
				email: values.email,
				orgId: currentOrgId,
				frontendBaseURL: window.location.origin,
			},
		});
	}, [form, forgotPasswordMutate, initialOrgId, hasMultipleOrgs]);

	const handleBackToLogin = useCallback((): void => {
		history.push(ROUTES.LOGIN);
	}, []);

	// Success screen
	if (isSuccess) {
		return <SuccessScreen onBackToLogin={handleBackToLogin} />;
	}

	// Form screen
	return (
		<div className="login-form-container">
			<Form
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
					<h4 className="forgot-password-title">Forgot your password?</h4>
					<p className="forgot-password-description">
						Send a reset link to your inbox and get back to monitoring.
					</p>
				</div>

				<div className="login-form-card">
					<div className="forgot-password-field">
						<label className="forgot-password-label" htmlFor="forgotPasswordEmail">
							Email address
						</label>
						<Form.Item name="email">
							<Input
								type="email"
								id="forgotPasswordEmail"
								data-testid="email"
								required
								disabled
								className="login-form-input"
							/>
						</Form.Item>
					</div>

					{hasMultipleOrgs && (
						<div className="forgot-password-field">
							<label className="forgot-password-label" htmlFor="orgId">
								Organization Name
							</label>
							<Form.Item
								name="orgId"
								rules={[{ required: true, message: 'Please select your organization' }]}
							>
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
							</Form.Item>
						</div>
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
			</Form>
		</div>
	);
}

export default ForgotPassword;
