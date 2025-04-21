import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

function LinkContainer({ children, href }: LinkContainerProps): JSX.Element {
	const isInternalLink = href.startsWith('/');

	if (isInternalLink) {
		return <Link to={href}>{children}</Link>;
	}

	return (
		<a rel="noreferrer" target="_blank" href={href}>
			{children}
		</a>
	);
}

interface LinkContainerProps {
	children: ReactNode;
	href: string;
}

export default LinkContainer;
