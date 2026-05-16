import { ChevronDown, ChevronUp, Loader } from '@signozhq/icons';
import KeyValueLabel from 'periscope/components/KeyValueLabel';

import { UseSpanPercentileReturn } from './useSpanPercentile';

import styles from './SpanPercentileBadge.module.scss';

type SpanPercentileBadgeProps = Pick<
	UseSpanPercentileReturn,
	| 'loading'
	| 'percentileValue'
	| 'duration'
	| 'spanPercentileData'
	| 'isOpen'
	| 'toggleOpen'
>;

function SpanPercentileBadge({
	loading,
	percentileValue,
	duration,
	spanPercentileData,
	isOpen,
	toggleOpen,
}: SpanPercentileBadgeProps): JSX.Element | null {
	if (loading) {
		return (
			<div className={styles.loader}>
				<Loader size={14} className="animate-spin" />
			</div>
		);
	}

	if (!spanPercentileData) {
		return null;
	}

	return (
		<div
			className={styles.root}
			onClick={toggleOpen}
			role="button"
			tabIndex={0}
			onKeyDown={(e): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					toggleOpen();
				}
			}}
		>
			<KeyValueLabel
				badgeKey={`p${percentileValue}`}
				badgeValue={
					<span className={styles.value}>
						{duration}
						{isOpen ? (
							<ChevronUp size={14} className={styles.icon} />
						) : (
							<ChevronDown size={14} className={styles.icon} />
						)}
					</span>
				}
			/>
		</div>
	);
}

export default SpanPercentileBadge;
