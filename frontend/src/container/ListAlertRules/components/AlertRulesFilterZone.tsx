import FilterZone from 'components/ListFilter/FilterZone/FilterZone';
import type { SuggestionSource } from 'components/ListFilter/dsl/types';
import type { CreatorOption } from 'components/ListFilter/types';

import { RULES_DSL_GRAMMAR } from '../rulesDslGrammar';
import RuleStatesFilter from './RuleStatesFilter';

interface Props {
	query: string;
	states: string[];
	creatorOptions: CreatorOption[];
	source: SuggestionSource;
	error: string | null;
	onQueryChange: (query: string) => void;
	onStatesChange: (states: string[]) => void;
}

function AlertRulesFilterZone({
	query,
	states,
	creatorOptions,
	source,
	error,
	onQueryChange,
	onStatesChange,
}: Props): JSX.Element {
	return (
		<FilterZone
			query={query}
			grammar={RULES_DSL_GRAMMAR}
			testIdPrefix="alert-rules"
			placeholder="DSL Filter — e.g. name CONTAINS 'cpu' AND labels.team = 'infra'"
			creatorOptions={creatorOptions}
			source={source}
			onQueryChange={onQueryChange}
			extraFilters={<RuleStatesFilter states={states} onChange={onStatesChange} />}
			hasExtraFilters={states.length > 0}
			onClearAll={(): void => onStatesChange([])}
			error={error ?? undefined}
		/>
	);
}

export default AlertRulesFilterZone;
