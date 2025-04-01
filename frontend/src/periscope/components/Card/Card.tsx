import './Card.styles.scss';

import cx from 'classnames';
import { ReactNode } from 'react';

type CardProps = {
	children: ReactNode;
	className?: string;
	size?: 'small' | 'medium' | 'large';
};

function Card({ children, className, size }: CardProps): JSX.Element {
	return <div className={cx('periscope-card', className, size)}>{children}</div>;
}

function CardHeader({ children }: { children: ReactNode }): JSX.Element {
	return <div className="periscope-card-header">{children}</div>;
}

function CardContent({ children }: { children: ReactNode }): JSX.Element {
	return <div className="periscope-card-content">{children}</div>;
}

function CardFooter({ children }: { children: ReactNode }): JSX.Element {
	return <div className="periscope-card-footer">{children}</div>;
}

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

Card.defaultProps = {
	className: '',
	size: 'medium',
};

export default Card;
