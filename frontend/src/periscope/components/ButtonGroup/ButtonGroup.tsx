import { ReactNode } from 'react';
import cx from 'classnames';

interface ButtonGroupProps {
	children: ReactNode;
	className?: string;
}

export default function ButtonGroup({
	children,
	className,
}: ButtonGroupProps): JSX.Element {
	return <div className={cx('periscope-btn-group', className)}>{children}</div>;
}

ButtonGroup.defaultProps = {
	className: '',
};
