import { Switch, Typography } from 'antd';
import LogsDownloadOptionsMenu from 'components/LogsDownloadOptionsMenu/LogsDownloadOptionsMenu';
import LogsFormatOptionsMenu from 'components/LogsFormatOptionsMenu/LogsFormatOptionsMenu';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useOptionsMenu } from 'container/OptionsMenu';
import { ArrowUp10, Minus } from 'lucide-react';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import QueryStatus from './QueryStatus';

function LogsActionsContainer({
	listQuery,
	selectedPanelType,
	showFrequencyChart,
	handleToggleFrequencyChart,
	orderBy,
	setOrderBy,
	isFetching,
	isLoading,
	isError,
	isSuccess,
	minTime,
	maxTime,
}: {
	listQuery: any;
	selectedPanelType: PANEL_TYPES;
	showFrequencyChart: boolean;
	handleToggleFrequencyChart: () => void;
	orderBy: string;
	setOrderBy: (value: string) => void;
	isFetching: boolean;
	isLoading: boolean;
	isError: boolean;
	isSuccess: boolean;
	minTime: number;
	maxTime: number;
}): JSX.Element {
	const { options, config } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator: listQuery?.aggregateOperator || StringOperators.NOOP,
	});

	const formatItems = [
		{
			key: 'raw',
			label: 'Raw',
			data: {
				title: 'max lines per row',
			},
		},
		{
			key: 'list',
			label: 'Default',
		},
		{
			key: 'table',
			label: 'Column',
			data: {
				title: 'columns',
			},
		},
	];

	return (
		<div className="logs-actions-container">
			<div className="tab-options">
				<div className="tab-options-left">
					{selectedPanelType === PANEL_TYPES.LIST && (
						<div className="frequency-chart-view-controller">
							<Typography>Frequency chart</Typography>
							<Switch
								size="small"
								checked={showFrequencyChart}
								defaultChecked
								onChange={handleToggleFrequencyChart}
							/>
						</div>
					)}
				</div>

				<div className="tab-options-right">
					{selectedPanelType === PANEL_TYPES.LIST && (
						<>
							<div className="order-by-container">
								<div className="order-by-label">
									Order by <Minus size={14} /> <ArrowUp10 size={14} />
								</div>

								<ListViewOrderBy
									value={orderBy}
									onChange={(value): void => setOrderBy(value)}
									dataSource={DataSource.LOGS}
								/>
							</div>
							<div className="download-options-container">
								<LogsDownloadOptionsMenu
									startTime={minTime}
									endTime={maxTime}
									filter={listQuery?.filter?.expression || ''}
									columns={config.addColumn?.value || []}
									orderBy={orderBy}
								/>
							</div>
							<div className="format-options-container">
								<LogsFormatOptionsMenu
									items={formatItems}
									selectedOptionFormat={options.format}
									config={config}
								/>
							</div>
						</>
					)}

					{(selectedPanelType === PANEL_TYPES.TIME_SERIES ||
						selectedPanelType === PANEL_TYPES.TABLE) && (
						<div className="query-stats">
							<QueryStatus
								loading={isLoading || isFetching}
								error={isError}
								success={isSuccess}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default LogsActionsContainer;
