import { type ReactElement, useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import FilterZone from 'components/ListFilter/FilterZone/FilterZone';
import type { SuggestionSource } from 'components/ListFilter/dsl/types';
import type {
	CreatorOption,
	FilterAppliedPayload,
	FilterAppliedType,
} from 'components/ListFilter/types';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';
import { LIST_CHECKS } from 'pages/DashboardsListPage/constants/permissions';

import { DASHBOARDS_DSL_GRAMMAR } from '../../utils/dashboardsDslGrammar';

interface Props {
	query: string;
	creatorOptions: CreatorOption[];
	source: SuggestionSource;
	onQueryChange: (value: string) => void;
	disabled?: boolean;
}

function DashboardsFilterZone({
	query,
	creatorOptions,
	source,
	onQueryChange,
	disabled = false,
}: Props): JSX.Element {
	const wrapControl = useCallback(
		(node: ReactElement): ReactElement => (
			<AuthZTooltip checks={LIST_CHECKS}>{node}</AuthZTooltip>
		),
		[],
	);

	const onSubmitted = useCallback((hasQuery: boolean): void => {
		void logEvent(DashboardListEvents.SearchExecuted, { hasQuery });
	}, []);

	const onFilterApplied = useCallback(
		(filterType: FilterAppliedType, payload: FilterAppliedPayload): void => {
			void logEvent(DashboardListEvents.FilterApplied, {
				filterType,
				...payload,
			});
		},
		[],
	);

	const onCleared = useCallback((): void => {
		void logEvent(DashboardListEvents.FiltersCleared, {});
	}, []);

	return (
		<FilterZone
			query={query}
			grammar={DASHBOARDS_DSL_GRAMMAR}
			testIdPrefix="dashboards"
			placeholder="DSL Filter — e.g. name CONTAINS 'api' AND env IN ['prod','staging']"
			creatorOptions={creatorOptions}
			source={source}
			disabled={disabled}
			wrapControl={wrapControl}
			onQueryChange={onQueryChange}
			onSubmitted={onSubmitted}
			onFilterApplied={onFilterApplied}
			onCleared={onCleared}
		/>
	);
}

export default DashboardsFilterZone;
