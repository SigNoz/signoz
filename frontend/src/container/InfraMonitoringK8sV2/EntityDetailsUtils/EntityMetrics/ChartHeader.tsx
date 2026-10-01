import { Link } from 'react-router-dom';
import { Compass, Info } from '@signozhq/icons';
import { Tooltip } from '@signozhq/ui/tooltip';

import styles from './ChartHeader.module.scss';
import { DOCS_BASE_URL } from 'constants/app';

const DOCS_ROOT = `${DOCS_BASE_URL}/docs`;

interface ChartHeaderProps {
	title: string;
	docPath?: string;
	tooltip?: string;
	metricsExplorerUrl?: string;
	metricsExplorerTestId?: string;
	onExploreClick?: () => void;
}

function ChartHeader({
	title,
	docPath,
	tooltip,
	metricsExplorerUrl,
	metricsExplorerTestId = 'open-metrics-explorer',
	onExploreClick,
}: ChartHeaderProps): JSX.Element {
	const renderInfoIcon = (): React.ReactNode => {
		if (docPath) {
			const tooltipTitle = tooltip || 'Not sure what this represents?';
			return (
				<Tooltip
					title={
						<>
							{tooltipTitle}{' '}
							<a
								href={`${DOCS_ROOT}${docPath}`}
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
				</Tooltip>
			);
		}

		if (tooltip) {
			return (
				<Tooltip title={tooltip}>
					<span className={styles.infoIcon} data-testid="chart-header-info-icon">
						<Info size="md" />
					</span>
				</Tooltip>
			);
		}

		return null;
	};

	return (
		<div className={styles.chartHeader} data-testid="chart-header">
			<span className={styles.chartHeaderLabel}>{title}</span>
			{renderInfoIcon()}
			{metricsExplorerUrl && (
				<Tooltip title="Go to Metrics Explorer">
					<Link
						to={metricsExplorerUrl}
						className={styles.metricsExplorerLink}
						data-testid={metricsExplorerTestId}
						onClick={onExploreClick}
					>
						<Compass size={14} />
					</Link>
				</Tooltip>
			)}
		</div>
	);
}

export default ChartHeader;
