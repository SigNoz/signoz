import { Toaster } from '@signozhq/ui/toast';

import styles from './AppToaster.module.scss';

function AppToaster(): JSX.Element {
	return (
		<Toaster position="bottom-right" offset={24} className={styles.toaster} />
	);
}

export default AppToaster;
