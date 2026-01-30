import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useCreateAlertState } from 'container/CreateAlertV2/context';
import ChartPreviewComponent from 'container/FormAlertRules/ChartPreview';
import PlotTag from 'container/NewWidget/LeftContainer/WidgetGraph/PlotTag';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';
import { AppState } from 'store/reducers';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';

export interface ChartPreviewProps {
	alertDef: AlertDef;
	source?: YAxisSource;
}

function ChartPreview({ alertDef, source }: ChartPreviewProps): JSX.Element {
	const { currentQuery, panelType, stagedQuery } = useQueryBuilder();
	const {
		alertType,
		thresholdState,
		alertState,
		setAlertState,
		isEditMode,
	} = useCreateAlertState();
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const [, setQueryStatus] = useState<string>('');

	const yAxisUnit = alertState.yAxisUnit || '';

	// Only update automatically when creating a new metrics-based alert rule
	const shouldUpdateYAxisUnit = useMemo(() => {
		// Do not update if we are coming to the page from dashboards (we still show warning)
		if (source === YAxisSource.DASHBOARDS) {
			return false;
		}
		return !isEditMode && alertType === AlertTypes.METRICS_BASED_ALERT;
	}, [isEditMode, alertType, source]);

	const selectedQueryName = thresholdState.selectedQuery;
	const { yAxisUnit: initialYAxisUnit, isLoading } = useGetYAxisUnit(
		selectedQueryName,
	);

	// Every time a new metric is selected, set the y-axis unit to its unit value if present
	// Only for metrics-based alerts in create mode
	useEffect(() => {
		if (shouldUpdateYAxisUnit) {
			setAlertState({ type: 'SET_Y_AXIS_UNIT', payload: initialYAxisUnit });
		}
	}, [initialYAxisUnit, setAlertState, shouldUpdateYAxisUnit]);

	const headline = (
		<div className="chart-preview-headline">
			<PlotTag
				queryType={currentQuery.queryType}
				panelType={panelType || PANEL_TYPES.TIME_SERIES}
			/>
			<YAxisUnitSelector
				value={yAxisUnit}
				initialValue={initialYAxisUnit}
				onChange={(value): void => {
					setAlertState({ type: 'SET_Y_AXIS_UNIT', payload: value });
				}}
				source={YAxisSource.ALERTS}
				loading={isLoading}
			/>
		</div>
	);

	const renderQBChartPreview = (): JSX.Element => (
		<ChartPreviewComponent
			headline={headline}
			name=""
			query={stagedQuery}
			selectedInterval={globalSelectedInterval}
			alertDef={alertDef}
			yAxisUnit={yAxisUnit || ''}
			graphType={panelType || PANEL_TYPES.TIME_SERIES}
			setQueryStatus={setQueryStatus}
			additionalThresholds={thresholdState.thresholds}
		/>
	);

	const renderPromAndChQueryChartPreview = (): JSX.Element => (
		<ChartPreviewComponent
			headline={headline}
			name="Chart Preview"
			query={stagedQuery}
			alertDef={alertDef}
			selectedInterval={globalSelectedInterval}
			yAxisUnit={yAxisUnit || ''}
			graphType={panelType || PANEL_TYPES.TIME_SERIES}
			setQueryStatus={setQueryStatus}
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
