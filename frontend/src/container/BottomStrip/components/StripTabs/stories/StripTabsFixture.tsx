import { useMemo, useState } from 'react';

import type { StripTabItem } from '../../../types';
import StripTabs from '../StripTabs';

import styles from './StripTabsFixture.module.scss';

const TITLES = [
	'Payment incident investigation for checkout',
	'Top noisy log patterns in prod',
	'Kafka lag',
	'Error rate before and after the 14:05 deploy',
	'Which dashboard panels load slowest?',
];

export interface StripTabsFixtureProps {
	/** How many tabs the row starts with. */
	tabs: number;
	/** How many of the last tabs carry a dot. */
	marked: number;
	/** Index of the tab that starts active; -1 for none. */
	active: number;
	/** Width of the strip the row shrinks into, in px. */
	width: number;
}

/** A strip-sized bar holding `StripTabs`; picking a tab activates it, × removes it. */
function StripTabsFixture({
	tabs,
	marked,
	active,
	width,
}: StripTabsFixtureProps): JSX.Element {
	const [activeId, setActiveId] = useState(active >= 0 ? `tab-${active}` : null);
	const [closedIds, setClosedIds] = useState<string[]>([]);

	const items = useMemo(
		() =>
			TITLES.slice(0, tabs)
				.map((label, index): StripTabItem => ({
					id: `tab-${index}`,
					label,
					isActive: activeId === `tab-${index}`,
					prefix:
						index >= tabs - marked ? (
							<span className={styles.dot} aria-hidden />
						) : undefined,
				}))
				.filter((item) => !closedIds.includes(item.id)),
		[tabs, marked, activeId, closedIds],
	);

	return (
		<div className={styles.strip} style={{ width }}>
			<StripTabs
				items={items}
				onSelect={setActiveId}
				onClose={(id): void => setClosedIds((ids) => [...ids, id])}
				testId="strip-tabs"
			/>
		</div>
	);
}

export default StripTabsFixture;
