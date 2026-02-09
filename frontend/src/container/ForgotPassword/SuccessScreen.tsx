import { Button } from '@signozhq/button';
import { ArrowLeft, Mail } from '@signozhq/icons';

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
					<h4 className="forgot-password-title">Check your email</h4>
					<p className="forgot-password-description">
						We&apos;ve sent a password reset link to your email. Please check your
						inbox and follow the instructions to reset your password.
					</p>
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
