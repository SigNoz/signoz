import { ReactNode } from 'react';

import styles from './ThreadEmptyState.module.scss';

interface ThreadEmptyStateProps {
	icon: ReactNode;
	title: string;
	description: string;
	actions?: ReactNode;
	testId: string;
}

function ThreadEmptyState({
	icon,
	title,
	description,
	actions,
	testId,
}: ThreadEmptyStateProps): JSX.Element {
	return (
		<div className={styles.root} data-testid={testId}>
			<span className={styles.icon}>{icon}</span>
			<span className={styles.title}>{title}</span>
			<span className={styles.description}>{description}</span>
			{actions && <div className={styles.actions}>{actions}</div>}
		</div>
	);
}

ThreadEmptyState.defaultProps = {
	actions: undefined,
};

export default ThreadEmptyState;
