import { Toaster } from '@signozhq/ui/toast';

import styles from './AppToaster.module.scss';

// The bottom clears the page-size select of a pagination bar, 83px above the bottom strip, and
// the 56px footer of a drawer or dialog panel, which sits 16px from the edge of the window.
const OFFSET = {
	top: 24,
	right: 24,
	bottom: 'calc(var(--bottom-strip-height, 0px) + 92px)',
	left: 24,
};

function AppToaster(): JSX.Element {
	return (
		<Toaster position="bottom-right" offset={OFFSET} className={styles.toaster} />
	);
}

export default AppToaster;
