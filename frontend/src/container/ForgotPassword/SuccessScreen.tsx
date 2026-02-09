import { Button } from '@signozhq/button';
import { ArrowLeft, Mail } from '@signozhq/icons';
import { Typography } from 'antd';

interface SuccessScreenProps {
	onBackToLogin: () => void;
}

function SuccessScreen({ onBackToLogin }: SuccessScreenProps): JSX.Element {
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
						onClick={onBackToLogin}
						prefixIcon={<ArrowLeft size={12} />}
					>
						Back to login
					</Button>
				</div>
			</div>
		</div>
	);
}

export default SuccessScreen;
