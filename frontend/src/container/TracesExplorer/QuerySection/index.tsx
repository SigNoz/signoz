import { Button } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOrderBy from 'container/ExplorerOrderBy';
import { QueryBuilder } from 'container/QueryBuilder';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useCallback, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { ButtonWrapper, Container } from './styles';

function QuerySection(): JSX.Element {
	const { handleRunQuery } = useQueryBuilder();

	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const isList = panelTypes === PANEL_TYPES.LIST;
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: false, isDisabled: false },
			limit: { isHidden: isList, isDisabled: true },
			having: { isHidden: isList, isDisabled: true },
		};

		return config;
	}, [panelTypes]);

	const renderOrderBy = useCallback(
		({ query, onChange }: OrderByFilterProps) => (
			<ExplorerOrderBy query={query} onChange={onChange} />
		),
		[],
	);

	const queryComponents = useMemo((): QueryBuilderProps['queryComponents'] => {
		const shouldRenderCustomOrderBy =
			panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE;

		return {
			...(shouldRenderCustomOrderBy ? { renderOrderBy } : {}),
		};
	}, [panelTypes, renderOrderBy]);

	return (
		<Container>
			<QueryBuilder
				panelType={panelTypes}
				config={{
					queryVariant: 'static',
					initialDataSource: DataSource.TRACES,
				}}
				filterConfigs={filterConfigs}
				queryComponents={queryComponents}
				version="v3" // setting this to v3 as we this is rendered in logs explorer
				actions={
					<ButtonWrapper>
						<Button onClick={(): void => handleRunQuery()} type="primary">
							Run Query
						</Button>
					</ButtonWrapper>
				}
			/>
		</Container>
	);
}

export default memo(QuerySection);
