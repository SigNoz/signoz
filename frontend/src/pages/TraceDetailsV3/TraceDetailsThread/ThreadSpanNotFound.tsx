import { Button } from '@signozhq/ui/button';
import { ArrowLeft, MessagesSquare, SearchX } from '@signozhq/icons';

import ThreadEmptyState from './ThreadEmptyState';

interface ThreadSpanNotFoundProps {
	onGoBack: () => void;
	onShowThread: () => void;
}

function ThreadSpanNotFound({
	onGoBack,
	onShowThread,
}: ThreadSpanNotFoundProps): JSX.Element {
	return (
		<ThreadEmptyState
			icon={<SearchX size={32} />}
			title="Span not found in this thread"
			description="The requested span isn't part of this trace's AI thread."
			testId="thread-span-not-found"
			actions={
				<>
					<Button
						variant="outlined"
						color="secondary"
						prefix={<ArrowLeft size={14} />}
						onClick={onGoBack}
						testId="thread-span-not-found-go-back"
					>
						Go back
					</Button>
					<Button
						variant="solid"
						color="primary"
						prefix={<MessagesSquare size={14} />}
						onClick={onShowThread}
						testId="thread-span-not-found-show-thread"
					>
						Show thread
					</Button>
				</>
			}
		/>
	);
}

export default ThreadSpanNotFound;
