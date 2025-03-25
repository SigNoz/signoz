import './FunnelMetricsTable.styles.scss';

interface MetricItem {
	title: string;
	value: number;
	unit: string;
}

interface FunnelMetricsTableProps {
	title: string;
	subtitle?: {
		label: string;
		value: string | number;
	};
	data: MetricItem[];
}

function FunnelMetricsTable({
	title,
	subtitle,
	data,
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
			<div className="funnel-metrics__grid">
				{data.map((metric) => (
					<div key={metric.title} className="funnel-metrics__item">
						<div className="funnel-metrics__item-title">{metric.title}</div>
						<div className="funnel-metrics__item-value">
							{metric.value}{' '}
							<span className="funnel-metrics__item-unit">{metric.unit}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

FunnelMetricsTable.defaultProps = {
	subtitle: undefined,
};

export default FunnelMetricsTable;
