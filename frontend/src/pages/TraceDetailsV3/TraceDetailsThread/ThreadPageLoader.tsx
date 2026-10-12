import { Skeleton } from '@signozhq/ui/skeleton';

import styles from './ThreadSpanList.module.scss';

interface ThreadPageLoaderProps {
	testId: string;
}

function ThreadPageLoader({ testId }: ThreadPageLoaderProps): JSX.Element {
	return (
		<div className={styles.pageLoader} data-testid={testId}>
			<Skeleton active title={{ width: '30%' }} paragraph={{ rows: 2 }} />
		</div>
	);
}

export default ThreadPageLoader;
