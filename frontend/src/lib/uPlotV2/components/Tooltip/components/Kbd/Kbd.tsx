import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';

import Styles from './Kbd.module.scss';

interface KbdProps {
	children: React.ReactNode;
	isPinned?: boolean;
}

export default function Kbd({
	children,
	isPinned = false,
}: KbdProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<kbd
			className={cx(Styles.kbd, {
				[Styles.lightMode]: !isDarkMode,
				[Styles.pinned]: isPinned,
			})}
		>
			{children}
		</kbd>
	);
}
