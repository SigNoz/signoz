import type { ReactNode } from 'react';

import styles from './AxesSection.module.scss';

/** One axis's fields, stacked under its heading. */
function AxisFields({ children }: { children: ReactNode }): JSX.Element {
	return <div className={styles.fields}>{children}</div>;
}

export default AxisFields;
