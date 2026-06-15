import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { TimelineFilter, TimelineTab } from 'container/AlertHistory/types';
import history from 'lib/history';
import { Info } from '@signozhq/icons';
import Tabs2 from 'periscope/components/Tabs2';

import styles from './TabsAndFilters.module.scss';

function ComingSoon(): JSX.Element {
	return (
		<div className={styles.comingSoon}>
			<div className={styles.comingSoonText}>Coming Soon</div>
			<div className={styles.comingSoonIcon}>
				<Info size={10} color={Color.BG_SIENNA_400} />
			</div>
		</div>
	);
}
function TimelineTabs(): JSX.Element {
	const tabs = [
		{
			value: TimelineTab.OVERALL_STATUS,
			label: 'Overall Status',
		},
		{
			value: TimelineTab.TOP_5_CONTRIBUTORS,
			label: (
				<div className={styles.top5Contributors}>
					Top 5 Contributors
					<ComingSoon />
				</div>
			),
			disabled: true,
		},
	];

	return <Tabs2 tabs={tabs} initialSelectedTab={TimelineTab.OVERALL_STATUS} />;
}

function TimelineFilters(): JSX.Element {
	const { search } = useLocation();
	const searchParams = useMemo(() => new URLSearchParams(search), [search]);

	const initialSelectedTab = useMemo(
		() => searchParams.get('timelineFilter') ?? TimelineFilter.ALL,
		[searchParams],
	);

	const handleFilter = (value: TimelineFilter): void => {
		searchParams.set('timelineFilter', value);
		history.push({ search: searchParams.toString() });
	};

	const tabs = [
		{
			value: TimelineFilter.ALL,
			label: 'All',
		},
		{
			value: TimelineFilter.FIRED,
			label: 'Fired',
		},
		{
			value: TimelineFilter.RESOLVED,
			label: 'Resolved',
		},
	];

	return (
		<Tabs2
			tabs={tabs}
			initialSelectedTab={initialSelectedTab}
			onSelectTab={handleFilter}
			hasResetButton
		/>
	);
}

function TabsAndFilters(): JSX.Element {
	return (
		<div className={styles.timelineTabsAndFilters}>
			<TimelineTabs />
			<TimelineFilters />
		</div>
	);
}

export default TabsAndFilters;
