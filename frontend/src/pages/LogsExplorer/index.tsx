import { Button, Col, Row } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import LogsExplorerViews from 'container/LogsExplorerViews';
import { QueryBuilder } from 'container/QueryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

// ** Styles
import { ButtonWrapperStyled, WrapperStyled } from './styles';
import { prepareQueryWithDefaultTimestamp } from './utils';

function LogsExplorer(): JSX.Element {
	const { handleRunQuery, updateAllQueriesOperators } = useQueryBuilder();
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const defaultValue = useMemo(() => {
		const updatedQuery = updateAllQueriesOperators(
			initialQueriesMap.logs,
			PANEL_TYPES.LIST,
			DataSource.LOGS,
		);
		return prepareQueryWithDefaultTimestamp(updatedQuery);
	}, [updateAllQueriesOperators]);

	useShareBuilderUrl(defaultValue);

	const inactiveLogsFilters: QueryBuilderProps['inactiveFilters'] = useMemo(() => {
		if (panelTypes === PANEL_TYPES.TABLE) {
			const result: QueryBuilderProps['inactiveFilters'] = { stepInterval: true };

			return result;
		}

		return {};
	}, [panelTypes]);

	return (
		<WrapperStyled>
			<Row gutter={[0, 28]}>
				<Col xs={24}>
					<QueryBuilder
						panelType={panelTypes}
						config={{ initialDataSource: DataSource.LOGS, queryVariant: 'static' }}
						inactiveFilters={inactiveLogsFilters}
						actions={
							<ButtonWrapperStyled>
								<Button type="primary" onClick={handleRunQuery}>
									Run Query
								</Button>
							</ButtonWrapperStyled>
						}
					/>
				</Col>
				<Col xs={24}>
					<LogsExplorerViews />
				</Col>
			</Row>
		</WrapperStyled>
	);
}

export default LogsExplorer;
