import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilder } from 'container/QueryBuilder';
import { useRef } from 'react';

import { Container } from './styles';

interface QuerySectionProps {
	runQuery: () => void;
}

function QuerySection({ runQuery }: QuerySectionProps): JSX.Element {
	const tagRef = useRef<HTMLDivElement>(null);

	return (
		<Container ref={tagRef}>
			<QueryBuilder
				panelType={PANEL_TYPES.TIME_SERIES}
				config={{
					queryVariant: 'static',
					initialDataSource: ALERTS_DATA_SOURCE_MAP.TRACES_BASED_ALERT,
				}}
				onRunQuery={runQuery}
			/>
		</Container>
	);
}

export default QuerySection;
