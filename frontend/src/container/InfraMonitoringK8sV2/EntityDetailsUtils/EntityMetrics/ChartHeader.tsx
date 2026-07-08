import { Info } from '@signozhq/icons';
import { Tooltip } from 'antd';

import styles from './ChartHeader.module.scss';

const DOCS_BASE_URL = `${process.env.DOCS_BASE_URL}/docs`;

interface ChartHeaderProps {
	title: string;
	docPath?: string;
	tooltip?: string;
}

function ChartHeader({
	title,
	docPath,
	tooltip,
}: ChartHeaderProps): JSX.Element {
	const renderInfoIcon = (): React.ReactNode => {
		if (docPath) {
			const tooltipTitle = tooltip || 'Not sure what this represents?';
			return (
				<Tooltip
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
		</div>
	);
}

export default ChartHeader;
