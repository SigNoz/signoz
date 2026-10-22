import type { ReactNode } from 'react';

import styles from './ConfigFieldRow.module.scss';

/** Side-by-side fields that wrap when the pane is narrow. */
function ConfigFieldRow({ children }: { children: ReactNode }): JSX.Element {
	return <div className={styles.row}>{children}</div>;
}

export default ConfigFieldRow;
