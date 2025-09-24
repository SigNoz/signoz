import { PANEL_TYPES } from 'constants/queryBuilder';
import { useCreateAlertState } from 'container/CreateAlertV2/context';
import ChartPreviewComponent from 'container/FormAlertRules/ChartPreview';
import PlotTag from 'container/NewWidget/LeftContainer/WidgetGraph/PlotTag';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { AlertDef } from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';

export interface ChartPreviewProps {
	alertDef: AlertDef;
}

function ChartPreview({ alertDef }: ChartPreviewProps): JSX.Element {
	const { currentQuery, panelType, stagedQuery } = useQueryBuilder();
	const { thresholdState, alertState } = useCreateAlertState();
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const [, setQueryStatus] = useState<string>('');

	const yAxisUnit = alertState.yAxisUnit || '';

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
			showSideLegend
			additionalThresholds={thresholdState.thresholds}
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
			showSideLegend
			additionalThresholds={thresholdState.thresholds}
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
