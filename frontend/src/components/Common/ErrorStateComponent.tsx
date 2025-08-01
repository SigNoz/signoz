import './Common.styles.scss';

import { Typography } from 'antd';

import APIError from '../../types/api/error';

interface ErrorStateComponentProps {
	message?: string;
	error?: APIError;
}

const defaultProps: Partial<ErrorStateComponentProps> = {
	message: undefined,
	error: undefined,
};

function ErrorStateComponent({
	message,
	error,
}: ErrorStateComponentProps): JSX.Element {
	// Handle API Error object
	if (error) {
		const mainMessage = error.getErrorMessage();
		const additionalErrors = error.getErrorDetails().error.errors || [];

		return (
			<div className="error-state-container">
				<div className="error-state-container-content">
					<Typography className="error-state-text">{mainMessage}</Typography>
					{additionalErrors.length > 0 && (
						<div className="error-state-additional-messages">
							{additionalErrors.map((additionalError) => (
								<Typography
									key={`error-${additionalError.message}`}
									className="error-state-additional-text"
								>
									• {additionalError.message}
								</Typography>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	// Handle simple string message (backwards compatibility)
	return (
		<div className="error-state-container">
			<div className="error-state-container-content">
				<Typography className="error-state-text">{message}</Typography>
			</div>
		</div>
	);
}

ErrorStateComponent.defaultProps = defaultProps;

export default ErrorStateComponent;
