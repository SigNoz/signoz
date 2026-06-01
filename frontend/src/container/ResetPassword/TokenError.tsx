import { CircleAlert } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import AuthError from 'components/AuthError/AuthError';
import AuthPageContainer from 'components/AuthPageContainer';
import APIError from 'types/api/error';

import './ResetPassword.styles.scss';

interface TokenErrorProps {
	error?: APIError;
}

function TokenError({ error }: TokenErrorProps): JSX.Element {
	return (
		<AuthPageContainer>
			<div className="reset-password-card">
				<div className="reset-password-header">
					<div className="reset-password-header-icon reset-password-header-icon--error">
						<CircleAlert size={32} />
					</div>
					<Typography.Title level={4} className="reset-password-header-title">
						Reset Password token is expired
					</Typography.Title>
					<Typography.Text className="reset-password-header-subtitle">
						Password reset links are single-use and expire after a set period. Please
						request a new password reset link.
					</Typography.Text>
				</div>
				{error && <AuthError error={error} />}
			</div>
		</AuthPageContainer>
	);
}

export default TokenError;
