import { Link } from 'react-router-dom';
import { Compass, Info } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './ChartHeader.module.scss';

const DOCS_BASE_URL = `${process.env.DOCS_BASE_URL}/docs`;

interface ChartHeaderProps {
	title: string;
	docPath?: string;
	tooltip?: string;
	metricsExplorerUrl?: string;
	metricsExplorerTestId?: string;
}

function ChartHeader({
	title,
	docPath,
	tooltip,
	metricsExplorerUrl,
	metricsExplorerTestId = 'open-metrics-explorer',
}: ChartHeaderProps): JSX.Element {
	const renderInfoIcon = (): React.ReactNode => {
		if (docPath) {
			const tooltipTitle = tooltip || 'Not sure what this represents?';
			return (
				<TooltipSimple
					arrow
					title={
						<>
							{tooltipTitle}{' '}
							<a
								href={`${DOCS_BASE_URL}${docPath}`}
								target="_blank"
								rel="noopener"
								onClick={(e): void => e.stopPropagation()}
							>
								Learn more.
							</a>
						</>
					}
				>
					<span className={styles.infoIcon} data-testid="chart-header-info-icon">
						<Info size="md" />
					</span>
				</TooltipSimple>
			);
		}

		if (tooltip) {
			return (
				<TooltipSimple title={tooltip} arrow>
					<span className={styles.infoIcon} data-testid="chart-header-info-icon">
						<Info size="md" />
					</span>
				</TooltipSimple>
			);
		}

		return null;
	};

	return (
		<div className={styles.chartHeader} data-testid="chart-header">
			<span className={styles.chartHeaderLabel}>{title}</span>
			{renderInfoIcon()}
			{metricsExplorerUrl && (
				<TooltipSimple title="Go to Metrics Explorer" arrow>
					<Link
						to={metricsExplorerUrl}
						className={styles.metricsExplorerLink}
						data-testid={metricsExplorerTestId}
					>
						<Compass size={14} />
					</Link>
				</TooltipSimple>
			)}
		</div>
	);
}

export default ChartHeader;
