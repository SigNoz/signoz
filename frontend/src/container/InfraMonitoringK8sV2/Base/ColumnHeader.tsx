import { Info } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './ColumnHeader.module.scss';
import cx from 'classnames';

const DOCS_BASE_URL = `${process.env.DOCS_BASE_URL}/docs`;

interface ColumnHeaderProps {
	children?: React.ReactNode;
	title?: string;
	docPath?: string;
	tooltip?: string;
	className?: string;
}

function ColumnHeader({
	children,
	title,
	docPath,
	tooltip,
	className,
}: ColumnHeaderProps): JSX.Element {
	const renderContent = (): React.ReactNode => {
		if (children) {
			return children;
		}

		if (title) {
			const parts = title.split('\n');
			return parts.map((part, index) => (
				<div key={`${part}-${index}`}>
					{part}
					{index < parts.length - 1 && <br />}
				</div>
			));
		}

		return null;
	};

	const renderInfoIcon = (): React.ReactNode => {
		if (docPath) {
			const tooltipTitle = tooltip || 'Not sure what this means?';
			return (
				<TooltipSimple
					arrow
					title={
						<>
							{tooltipTitle}{' '}
							<a
								href={`${DOCS_BASE_URL}${docPath}`}
								target="_blank"
								rel="noopener noreferrer"
								onClick={(e): void => e.stopPropagation()}
							>
								Learn more.
							</a>
						</>
					}
				>
					<div className={styles.infoIcon}>
						<Info size="md" />
					</div>
				</TooltipSimple>
			);
		}

		if (tooltip) {
			return (
				<TooltipSimple title={tooltip}>
					<div className={styles.infoIcon}>
						<Info size="md" />
					</div>
				</TooltipSimple>
			);
		}

		return null;
	};

	return (
		<div className={cx(styles.columnHeader, className)} data-slot="column-header">
			<div className={styles.columnHeaderLabel}>{renderContent()}</div>
			{renderInfoIcon()}
		</div>
	);
}

export default ColumnHeader;
