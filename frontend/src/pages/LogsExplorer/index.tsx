import { Button, Col, Row } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import LogsExplorerChart from 'container/LogsExplorerChart';
import LogsExplorerViews from 'container/LogsExplorerViews';
import { QueryBuilder } from 'container/QueryBuilder';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

// ** Styles
import { ButtonWrapperStyled, WrapperStyled } from './styles';

function LogsExporer(): JSX.Element {
	const { handleRunQuery, updateAllQueriesOperators } = useQueryBuilder();
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const defaultValue = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap.logs,
				PANEL_TYPES.LIST,
				DataSource.LOGS,
			),
		[updateAllQueriesOperators],
	);

	useShareBuilderUrl(defaultValue);

	return (
		<WrapperStyled>
			<Row gutter={[0, 28]}>
				<Col xs={24}>
					<QueryBuilder
						panelType={panelTypes}
						config={{ initialDataSource: DataSource.LOGS, queryVariant: 'static' }}
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
					<LogsExplorerChart />
					<LogsExplorerViews />
				</Col>
			</Row>
		</WrapperStyled>
	);
}

export default LogsExporer;
