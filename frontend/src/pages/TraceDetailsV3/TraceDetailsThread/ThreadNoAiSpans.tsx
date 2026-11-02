import { ArrowRight } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { openInNewTab } from 'utils/navigation';

import noDataUrl from '@/assets/Icons/no-data.svg';

import { LLM_OBSERVABILITY_DOCS_URL } from '../constants';

import styles from './ThreadNoAiSpans.module.scss';

function ThreadNoAiSpans(): JSX.Element {
	return (
		<div className={styles.root} data-testid="thread-empty">
			<img src={noDataUrl} alt="" className={styles.noDataImg} />
			<span className={styles.title}>
				This trace has no spans from AI-related actions
			</span>
			<span className={styles.description}>
				Thread view summarising your entire AI-journey history will appear here when
				the spans have the necessary datapoints.
			</span>
			<div className={styles.actions}>
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
		</div>
	);
}

export default ThreadNoAiSpans;
