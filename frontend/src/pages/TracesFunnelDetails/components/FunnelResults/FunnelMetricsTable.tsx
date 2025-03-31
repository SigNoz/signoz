import './FunnelMetricsTable.styles.scss';

import { Empty } from 'antd';
import Spinner from 'components/Spinner';

export interface MetricItem {
	title: string;
	value: string | number;
}

interface FunnelMetricsTableProps {
	title: string;
	subtitle?: {
		label: string;
		value: string | number;
	};
	data: MetricItem[];
	isLoading?: boolean;
	isError?: boolean;
	emptyState?: JSX.Element;
}

function FunnelMetricsContentRenderer({
	data,
	isLoading,
	isError,
	emptyState,
}: {
	data: MetricItem[];
	isLoading?: boolean;
	isError?: boolean;
	emptyState?: JSX.Element;
}): JSX.Element {
	if (isLoading)
		return (
			<div className="funnel-metrics--loading-state">
				<Spinner size="small" height="100%" />
			</div>
		);
	if (data.length === 0 && emptyState) {
		return emptyState;
	}

	if (isError) {
		return (
			<Empty description="Error fetching data. If the problem persists, please contact support." />
		);
	}

	return (
		<div className="funnel-metrics__grid">
			{data.map((metric) => (
				<div key={metric.title} className="funnel-metrics__item">
					<div className="funnel-metrics__item-title">{metric.title}</div>
					<div className="funnel-metrics__item-value">{metric.value}</div>
				</div>
			))}
		</div>
	);
}
FunnelMetricsContentRenderer.defaultProps = {
	isLoading: false,
	isError: false,
	emptyState: <Empty className="funnel-metrics--empty-state" />,
};

function FunnelMetricsTable({
	title,
	subtitle,
	data,
	isLoading,
	isError,
	emptyState,
}: FunnelMetricsTableProps): JSX.Element {
	return (
		<div className="funnel-metrics">
			<div className="funnel-metrics__header">
				<div className="funnel-metrics__title">{title}</div>
				{subtitle && (
					<div className="funnel-metrics__subtitle">
						<span className="funnel-metrics__subtitle-label">{subtitle.label}</span>
						<span className="funnel-metrics__subtitle-separator">⎯</span>
						<span className="funnel-metrics__subtitle-value">{subtitle.value}</span>
					</div>
				)}
			</div>
			<FunnelMetricsContentRenderer
				data={data}
				isLoading={isLoading}
				emptyState={emptyState}
				isError={isError}
			/>
		</div>
	);
}

FunnelMetricsTable.defaultProps = {
	subtitle: undefined,
	isLoading: false,
	emptyState: <Empty className="funnel-metrics--empty-state" />,
	isError: false,
};

export default FunnelMetricsTable;
