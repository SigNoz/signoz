import { Button } from '@signozhq/ui/button';
import { ArrowLeft, MessagesSquare, SearchX } from '@signozhq/icons';

import styles from './ThreadSpanNotFound.module.scss';

interface ThreadSpanNotFoundProps {
	onGoBack: () => void;
	onShowThread: () => void;
}

function ThreadSpanNotFound({
	onGoBack,
	onShowThread,
}: ThreadSpanNotFoundProps): JSX.Element {
	return (
		<div className={styles.root} data-testid="thread-span-not-found">
			<span className={styles.icon}>
				<SearchX size={32} />
			</span>
			<span className={styles.title}>Span not found in this thread</span>
			<span className={styles.description}>
				The requested span isn&apos;t part of this trace&apos;s AI thread.
			</span>
			<div className={styles.actions}>
				<Button
					variant="outlined"
					color="secondary"
					size="md"
					prefix={<ArrowLeft size={14} />}
					onClick={onGoBack}
					testId="thread-span-not-found-go-back"
				>
					Go back
				</Button>
				<Button
					variant="solid"
					color="primary"
					size="md"
					prefix={<MessagesSquare size={14} />}
					onClick={onShowThread}
					testId="thread-span-not-found-show-thread"
				>
					Show thread
				</Button>
			</div>
		</div>
	);
}

export default ThreadSpanNotFound;
