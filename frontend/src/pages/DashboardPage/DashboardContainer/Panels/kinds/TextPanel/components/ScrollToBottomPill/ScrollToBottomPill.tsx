import { ChevronsDown } from '@signozhq/icons';

import styles from './ScrollToBottomPill.module.scss';

interface ScrollToBottomPillProps {
	onClick: () => void;
}

/**
 * Floating affordance signalling content below the fold; click jumps to the end.
 */
function ScrollToBottomPill({ onClick }: ScrollToBottomPillProps): JSX.Element {
	return (
		<button
			type="button"
			className={styles.pill}
			onClick={onClick}
			data-testid="text-panel-scroll-more"
		>
			<ChevronsDown size={14} />
			<span>Scroll for more</span>
		</button>
	);
}

export default ScrollToBottomPill;
