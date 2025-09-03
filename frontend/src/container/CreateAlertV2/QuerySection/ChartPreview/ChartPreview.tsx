import { PANEL_TYPES } from 'constants/queryBuilder';
import { useCreateAlertState } from 'container/CreateAlertV2/context';
import ChartPreviewComponent from 'container/FormAlertRules/ChartPreview';
import PlotTag from 'container/NewWidget/LeftContainer/WidgetGraph/PlotTag';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { LegendPosition } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';

function ChartPreview(): JSX.Element {
	const { currentQuery, panelType, stagedQuery } = useQueryBuilder();
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const [, setQueryStatus] = useState<string>('');
	const { alertDef } = useCreateAlertState();

	const yAxisUnit = currentQuery.unit || '';

	const renderQBChartPreview = (): JSX.Element => (
		<ChartPreviewComponent
			headline={
				<PlotTag
					queryType={currentQuery.queryType}
					panelType={panelType || PANEL_TYPES.TIME_SERIES}
				/>
			}
			name=""
			query={stagedQuery}
			selectedInterval={globalSelectedInterval}
			alertDef={alertDef}
			yAxisUnit={yAxisUnit || ''}
			graphType={panelType || PANEL_TYPES.TIME_SERIES}
			setQueryStatus={setQueryStatus}
			legendPosition={LegendPosition.RIGHT}
		/>
	);

	const renderPromAndChQueryChartPreview = (): JSX.Element => (
		<ChartPreviewComponent
			headline={
				<PlotTag
					queryType={currentQuery.queryType}
					panelType={panelType || PANEL_TYPES.TIME_SERIES}
				/>
			}
			name="Chart Preview"
			query={stagedQuery}
			alertDef={alertDef}
			selectedInterval={globalSelectedInterval}
			yAxisUnit={yAxisUnit || ''}
			graphType={panelType || PANEL_TYPES.TIME_SERIES}
			setQueryStatus={setQueryStatus}
			legendPosition={LegendPosition.RIGHT}
		/>
	);

	return (
		<div className="chart-preview-container">
			{currentQuery.queryType === EQueryType.QUERY_BUILDER &&
				renderQBChartPreview()}
			{currentQuery.queryType === EQueryType.PROM &&
				renderPromAndChQueryChartPreview()}
			{currentQuery.queryType === EQueryType.CLICKHOUSE &&
				renderPromAndChQueryChartPreview()}
		</div>
	);
}

export default ChartPreview;
