import { CircleAlert } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import AuthError from 'components/AuthError/AuthError';
import AuthPageContainer from 'components/AuthPageContainer';
import APIError from 'types/api/error';

import './ResetPassword.styles.scss';

interface TokenErrorContent {
	title: string;
	subtitle: string;
}

function getErrorContent(error?: APIError): TokenErrorContent {
	const code = error?.getErrorCode();

	if (code === 'reset_password_token_expired') {
		return {
			title: 'Reset Password token is expired',
			subtitle:
				'Password reset links are single-use and expire after a set period. Please request a new password reset link.',
		};
	}

	if (code === 'reset_password_token_not_found') {
		return {
			title: 'Invalid Reset Link',
			subtitle:
				'This reset password link is invalid or has already been used. Please request a new password reset link.',
		};
	}

	return {
		title: 'Reset Link Unavailable',
		subtitle:
			'We could not validate your reset password link. Please request a new one.',
	};
}

interface TokenErrorProps {
	error?: APIError;
}

function TokenError({ error }: TokenErrorProps): JSX.Element {
	const { title, subtitle } = getErrorContent(error);

	return (
		<AuthPageContainer>
			<div className="reset-password-card reset-password-card--centered">
				<div className="reset-password-header">
					<div className="reset-password-header-icon reset-password-header-icon--error">
						<CircleAlert size={32} />
					</div>
					<Typography.Title level={4} className="reset-password-header-title">
						{title}
					</Typography.Title>
					<Typography.Text className="reset-password-header-subtitle">
						{subtitle}
					</Typography.Text>
				</div>
				{error && <AuthError error={error} />}
			</div>
		</AuthPageContainer>
	);
}

export default TokenError;
