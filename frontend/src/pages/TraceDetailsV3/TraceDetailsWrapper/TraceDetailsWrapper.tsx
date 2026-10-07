import { ReactNode } from 'react';

import TraceStoreSync from '../stores/TraceStoreSync';

import styles from './TraceDetailsWrapper.module.scss';

interface TraceDetailsWrapperProps {
	children: ReactNode;
}

function TraceDetailsWrapper({
	children,
}: TraceDetailsWrapperProps): JSX.Element {
	return (
		<TraceStoreSync>
			<div className={styles.root}>{children}</div>
		</TraceStoreSync>
	);
}

export default TraceDetailsWrapper;
