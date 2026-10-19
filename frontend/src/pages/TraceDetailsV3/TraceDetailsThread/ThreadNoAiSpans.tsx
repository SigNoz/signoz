import { ArrowRight } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
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
					<Typography size="base" weight="medium" color="muted">
						Looks like this trace does not have any spans from AI-related actions.
					</Typography>
					<Typography size="base" weight="medium" className={styles.highlight}>
						Thread view summarising your entire AI-journey history will appear here
						when the spans have the necessary datapoints.
					</Typography>
				</div>
			</div>
			<Button
				variant="solid"
				color="secondary"
				size="md"
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
