import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import { CircleAlert } from 'lucide-react';
import APIError from 'types/api/error';

import './AuthError.styles.scss';

interface AuthErrorProps {
	error: APIError;
}

function AuthError({ error }: AuthErrorProps): JSX.Element {
	return (
		<div className="auth-error-container">
			<ErrorContent
				error={error}
				icon={<CircleAlert size={12} className="auth-error-icon" />}
			/>
		</div>
	);
}

export default AuthError;
