import type { ReactNode } from 'react';

import styles from './ListHeaderZone.module.scss';

interface Props {
	/** Rendered regardless of whether the list has anything in it. */
	children: ReactNode;
	testId?: string;
}

function ListHeaderZone({ children, testId }: Props): JSX.Element {
	return (
		<div className={styles.headerZone} data-testid={testId}>
			{children}
		</div>
	);
}

export default ListHeaderZone;
