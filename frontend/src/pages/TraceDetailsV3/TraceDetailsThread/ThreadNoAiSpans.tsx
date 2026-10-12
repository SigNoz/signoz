import { ArrowRight } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { openInNewTab } from 'utils/navigation';

import { LLM_OBSERVABILITY_DOCS_URL } from '../constants';

import styles from './ThreadNoAiSpans.module.scss';

function ThreadNoAiSpans(): JSX.Element {
	return (
		<div className={styles.root} data-testid="thread-empty">
			<div className={styles.message}>
				<span className={styles.emoji} aria-hidden>
					🚏
				</span>
				<div className={styles.paragraphs}>
					<p className={styles.text}>
						Looks like this trace does not have any spans from AI-related actions.
					</p>
					<p className={styles.highlight}>
						Thread view summarising your entire AI-journey history will appear here
						when the spans have the necessary datapoints.
					</p>
				</div>
			</div>
			<Button
				variant="solid"
				color="secondary"
				suffix={<ArrowRight size={12} />}
				onClick={(): void => {
					openInNewTab(LLM_OBSERVABILITY_DOCS_URL);
				}}
				testId="thread-empty-learn-more"
			>
				Learn more
			</Button>
		</div>
	);
}

export default ThreadNoAiSpans;
