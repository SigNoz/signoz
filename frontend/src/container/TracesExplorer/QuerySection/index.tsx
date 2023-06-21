import { Button } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilder } from 'container/QueryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DataSource } from 'types/common/queryBuilder';

import { ButtonWrapper, Container } from './styles';

function QuerySection(): JSX.Element {
	const { handleRunQuery } = useQueryBuilder();

	return (
		<Container>
			<QueryBuilder
				panelType={PANEL_TYPES.TIME_SERIES}
				config={{
					queryVariant: 'static',
					initialDataSource: DataSource.TRACES,
				}}
				actions={
					<ButtonWrapper>
						<Button onClick={handleRunQuery} type="primary">
							Run Query
						</Button>
					</ButtonWrapper>
				}
			/>
		</Container>
	);
}

export default QuerySection;
