import { Button } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilder } from 'container/QueryBuilder';
import { ButtonWrapper } from 'container/TracesExplorer/QuerySection/styles';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DataSource } from 'types/common/queryBuilder';

function QuerySection(): JSX.Element {
	const { handleRunQuery } = useQueryBuilder();

	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.TIME_SERIES);

	return (
		<div className="query-section">
			<QueryBuilder
				panelType={panelTypes}
				config={{ initialDataSource: DataSource.METRICS, queryVariant: 'static' }}
				version="v4"
				actions={
					<ButtonWrapper>
						<Button onClick={(): void => handleRunQuery()} type="primary">
							Run Query
						</Button>
					</ButtonWrapper>
				}
			/>
		</div>
	);
}

export default QuerySection;
