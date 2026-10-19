import { Skeleton } from '@signozhq/ui/skeleton';

import styles from './ThreadSpanList.module.scss';

interface ThreadPageLoaderProps {
	testId: string;
}

// Mirrors a span card: a short message, then an output with a block and a chip.
function ThreadPageLoader({ testId }: ThreadPageLoaderProps): JSX.Element {
	return (
		<div className={styles.pageLoader} data-testid={testId}>
			<Skeleton active title={{ width: 48 }} paragraph={{ rows: 1 }} />
			<Skeleton
				active
				title={{ width: 112 }}
				paragraph={{ rows: 3, width: ['100%', '100%', 160] }}
			/>
		</div>
	);
}

export default ThreadPageLoader;
