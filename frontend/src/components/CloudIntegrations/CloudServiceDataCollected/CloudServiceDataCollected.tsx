import { Table } from 'antd';
import {
	CloudintegrationtypesCollectedLogAttributeDTO,
	CloudintegrationtypesCollectedMetricDTO,
} from 'api/generated/services/sigNoz.schemas';
import { BarChart, Info, ScrollText } from '@signozhq/icons';
import { TooltipProvider, TooltipSimple } from '@signozhq/ui/tooltip';

import './CloudServiceDataCollected.styles.scss';

function CloudServiceDataCollected({
	logsData,
	metricsData,
	metricsInfoTooltip,
}: {
	logsData: CloudintegrationtypesCollectedLogAttributeDTO[] | null | undefined;
	metricsData: CloudintegrationtypesCollectedMetricDTO[] | null | undefined;
	metricsInfoTooltip?: string;
}): JSX.Element {
	const logsColumns = [
		{
			title: 'NAME',
			dataIndex: 'name',
			key: 'name',
			width: '30%',
		},
		{
			title: 'PATH',
			dataIndex: 'path',
			key: 'path',
			width: '40%',
		},
		{
			title: 'FACET TYPE',
			dataIndex: 'type',
			key: 'type',
			width: '30%',
		},
	];

	const metricsColumns = [
		{
			title: 'NAME',
			dataIndex: 'name',
			key: 'name',
			width: '40%',
		},
		{
			title: 'UNIT',
			dataIndex: 'unit',
			key: 'unit',
			width: '30%',
		},
		{
			title: 'TYPE',
			dataIndex: 'type',
			key: 'type',
			width: '30%',
		},
	];

	const tableProps = {
		pagination: { pageSize: 20, hideOnSinglePage: true },
		showHeader: true,
		size: 'middle' as const,
		bordered: false,
	};

	return (
		<div className="cloud-service-data-collected">
			{logsData && logsData.length > 0 && (
				<div className="cloud-service-data-collected-table">
					<div className="cloud-service-data-collected-table-heading">
						<ScrollText size={14} />
						Logs
					</div>
					<Table
						columns={logsColumns}
						dataSource={logsData}
						{...tableProps}
						className="cloud-service-data-collected-table-logs"
					/>
				</div>
			)}
			{metricsData && metricsData.length > 0 && (
				<div className="cloud-service-data-collected-table">
					<div className="cloud-service-data-collected-table-heading">
						<BarChart size={14} />
						Metrics
						{metricsInfoTooltip && (
							<TooltipProvider>
								<TooltipSimple
									title={metricsInfoTooltip}
									side="top"
									tooltipContentProps={{
										className: 'cloud-service-data-collected-table-tooltip',
									}}
								>
									<span
										className="cloud-service-data-collected-table-heading-info"
										aria-label="About the metrics listed below"
										data-testid="data-collected-metrics-info"
									>
										<Info size={12} />
									</span>
								</TooltipSimple>
							</TooltipProvider>
						)}
					</div>
					<Table
						columns={metricsColumns}
						dataSource={metricsData}
						{...tableProps}
						className="cloud-service-data-collected-table-metrics"
					/>
				</div>
			)}
		</div>
	);
}

CloudServiceDataCollected.defaultProps = {
	metricsInfoTooltip: undefined,
};

export default CloudServiceDataCollected;
