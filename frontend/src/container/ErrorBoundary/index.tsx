import React from 'react';
import ErrorComponent from './Error';

class ErrorBoundary extends React.Component<Props, State> {
	state: Readonly<State> = {
		isError: false,
		error: undefined,
		errorInfo: undefined,
	};

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		this.setState((state) => ({
			...state,
			isError: true,
			error,
			errorInfo,
		}));
	}

	render(): React.ReactNode {
		const { children } = this.props;
		const { isError, error, errorInfo } = this.state;

		if (isError && error && errorInfo) {
			return (
				<ErrorComponent
					{...{
						error,
						errorInfo,
					}}
				/>
			);
		}

		return children;
	}
}

interface Props {
	children: React.ReactNode;
}

interface State {
	isError: boolean;
	error: Error | undefined;
	errorInfo: React.ErrorInfo | undefined;
}

export default ErrorBoundary;
