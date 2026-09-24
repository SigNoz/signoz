import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { TimelineFilter, TimelineTab } from 'container/AlertHistory/types';
import history from 'lib/history';
import { Info } from '@signozhq/icons';
import Tabs2 from 'periscope/components/Tabs2';

import './TabsAndFilters.styles.scss';

function ComingSoon(): JSX.Element {
	return (
		<div className="coming-soon">
			<div className="coming-soon__text">Coming Soon</div>
			<div className="coming-soon__icon">
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
			testId: 'timeline-tab-overall-status',
		},
		{
			value: TimelineTab.TOP_5_CONTRIBUTORS,
			label: (
				<div className="top-5-contributors">
					Top 5 Contributors
					<ComingSoon />
				</div>
			),
			disabled: true,
			testId: 'timeline-tab-top-contributors',
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
			testId: 'timeline-filter-all',
		},
		{
			value: TimelineFilter.FIRED,
			label: 'Fired',
			testId: 'timeline-filter-fired',
		},
		{
			value: TimelineFilter.RESOLVED,
			label: 'Resolved',
			testId: 'timeline-filter-resolved',
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
		<div className="timeline-tabs-and-filters">
			<TimelineTabs />
			<TimelineFilters />
		</div>
	);
}

export default TabsAndFilters;
