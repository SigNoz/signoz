import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';

interface AIQuerySectionProps {
	panelType: PANEL_TYPES;
}

function AIQuerySection({ panelType }: AIQuerySectionProps): JSX.Element {
	return (
		<QueryBuilderV2
			panelType={panelType}
			config={{
				queryVariant: 'static',
				initialDataSource: DataSource.TRACES,
			}}
			showTraceOperator={false}
			version={ENTITY_VERSION_V5}
		/>
	);
}

export default AIQuerySection;
