import type { StripTabItem } from '../../types';
import StripTab from '../StripTab/StripTab';

import styles from './StripTabs.module.scss';

interface StripTabsProps {
	items: StripTabItem[];
	onSelect: (id: string) => void;
	onClose: (id: string) => void;
	/** Each tab gets `${testId}-${item.id}`, with `-open` / `-close` on its buttons. */
	testId?: string;
}

/** Closable tabs that shrink to share whatever width their container leaves. */
function StripTabs({
	items,
	onSelect,
	onClose,
	testId,
}: StripTabsProps): JSX.Element | null {
	if (items.length === 0) {
		return null;
	}

	return (
		<div className={styles.stripTabs} data-testid={testId}>
			{items.map((item) => (
				<StripTab
					key={item.id}
					label={item.label}
					prefix={item.prefix}
					isActive={item.isActive}
					ariaLabel={item.ariaLabel}
					onClick={(): void => onSelect(item.id)}
					onClose={(): void => onClose(item.id)}
					testId={testId ? `${testId}-${item.id}` : undefined}
				/>
			))}
		</div>
	);
}

StripTabs.defaultProps = { testId: undefined };

export default StripTabs;
