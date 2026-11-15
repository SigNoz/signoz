import cx from 'classnames';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Skeleton } from '@signozhq/ui/skeleton';

import logEvent from 'api/common/logEvent';
import DotGrid from 'components/DotGrid/DotGrid';

import { AIAssistantEvents, SuggestedPromptCategory } from '../../../events';
import { useVariant } from '../../../VariantContext';
import { EMPTY_STATE_CHIPS_FALLBACK } from '../emptyStateChipsFallback';
import { useEmptyStateChips } from '../useEmptyStateChips';

import styles from './EmptyState.module.scss';

interface EmptyStateProps {
	onSendSuggestedPrompt: (text: string) => void;
}

/** A new chat: the dot grid, Noz's intro and the suggested prompts. */
export default function EmptyState({
	onSendSuggestedPrompt,
}: EmptyStateProps): JSX.Element {
	const isCompact = useVariant() === 'panel';
	const { chips: emptyStateChips, isLoading: areChipsLoading } =
		useEmptyStateChips(true);

	return (
		<div className={cx(styles.empty, { [styles.compact]: isCompact })}>
			<DotGrid className={styles.dotGrid} />
			<div className={styles.emptyContent}>
				<div className={styles.emptyIntro}>
					<div className={styles.emptyHeading}>
						<h3 className={styles.emptyTitle}>Noz</h3>
						<Badge color="secondary" variant="outlined">
							beta
						</Badge>
					</div>
					<p className={styles.emptySubtitle}>
						I can help you understand and be the all-seeing eye over your entire
						infrastructure. What do you need?
					</p>
				</div>
				<div className={styles.suggestions} aria-busy={areChipsLoading}>
					{/* As many as the backend sends, each the width of a real prompt. */}
					{areChipsLoading &&
						EMPTY_STATE_CHIPS_FALLBACK.map((chip) => (
							<span
								key={chip.id}
								className={styles.suggestionSkeleton}
								data-testid="empty-state-chip-skeleton"
								aria-hidden
							>
								<Skeleton.Input
									active
									block
									className={styles.suggestionSkeletonFill}
								/>
								{chip.text}
							</span>
						))}
					{emptyStateChips.map((chip) => (
						<Button
							key={chip.id}
							variant="ghost"
							color="secondary"
							size="md"
							onClick={(): void => {
								void logEvent(AIAssistantEvents.SuggestedPromptClicked, {
									promptId: chip.id,
									category: SuggestedPromptCategory.EmptyState,
								});
								onSendSuggestedPrompt(chip.text);
							}}
							testId={`empty-state-chip-${chip.id}`}
						>
							{chip.text}
						</Button>
					))}
				</div>
			</div>
		</div>
	);
}
