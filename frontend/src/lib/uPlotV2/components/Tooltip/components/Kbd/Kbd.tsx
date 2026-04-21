import cx from 'classnames';

import Styles from './Kbd.module.scss';

interface KbdProps {
	children: React.ReactNode;
	className?: string;
}

export default function Kbd({ children, className }: KbdProps): JSX.Element {
	return <kbd className={cx(Styles.kbd, className)}>{children}</kbd>;
}
