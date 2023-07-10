import { Button } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilder } from 'container/QueryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { ButtonWrapper, Container } from './styles';

function QuerySection(): JSX.Element {
	const { handleRunQuery } = useQueryBuilder();

	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: false, isDisabled: true },
		};

		return config;
	}, []);

	return (
		<Container>
			<QueryBuilder
				panelType={panelTypes}
				config={{
					queryVariant: 'static',
					initialDataSource: DataSource.TRACES,
				}}
				filterConfigs={filterConfigs}
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

export default memo(QuerySection);
