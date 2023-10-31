/* eslint-disable @typescript-eslint/ban-types */
import { Component, ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryProps = {
	children: ReactNode;
};

type ErrorBoundaryState = {
	hasError: boolean;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Handle the error and update the state
		this.setState({ hasError: true });
		// You can also log the error to a service like Sentry or report it to the server.
		console.error(error, errorInfo);
	}

	render(): JSX.Element {
		const { hasError } = this.state;
		const { children } = this.props;

		if (hasError) {
			// Render a fallback UI when an error occurs
			return (
				<div>
					<h1>Something went wrong</h1>
					<p>We apologize for the inconvenience.</p>
				</div>
			);
		}

		// Render the children if no error occurred
		return <> {children} </>;
	}
}

export default ErrorBoundary;
