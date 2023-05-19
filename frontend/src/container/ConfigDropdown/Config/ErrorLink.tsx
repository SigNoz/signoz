import { PureComponent } from 'react';

interface State {
	hasError: boolean;
}

interface Props {
	children: JSX.Element;
}

class ErrorLink extends PureComponent<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	render(): JSX.Element {
		const { children } = this.props;
		const { hasError } = this.state;

		if (hasError) {
			return <div />;
		}

		return children;
	}
}

export default ErrorLink;
