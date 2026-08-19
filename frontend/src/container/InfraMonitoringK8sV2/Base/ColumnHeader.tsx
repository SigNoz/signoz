import { Info } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './ColumnHeader.module.scss';
import cx from 'classnames';
import { MouseEventHandler } from 'react';

const DOCS_BASE_URL = `${process.env.DOCS_BASE_URL}/docs`;

interface ColumnHeaderProps {
	children?: React.ReactNode;
	docPath?: string;
	tooltip?: React.ReactNode;
	className?: string;
}

function ColumnHeader({
	children,
	docPath,
	tooltip,
	className,
}: ColumnHeaderProps): JSX.Element {
	const stopPropagationHandler: MouseEventHandler = (e): void =>
		e.stopPropagation();

	const renderContent = (): React.ReactNode => {
		if (children) {
			return children;
		}

		return null;
	};

	const renderInfoIcon = (): React.ReactNode => {
		if (docPath) {
			const tooltipTitle = tooltip || 'Not sure what this means?';
			const isJustStringTitle = typeof tooltipTitle === 'string';

			return (
				<TooltipSimple
					arrow
					title={
						<div onClick={stopPropagationHandler}>
							{tooltipTitle}{' '}
							<a
								href={`${DOCS_BASE_URL}${docPath}`}
								target="_blank"
								rel="noopener"
								onClick={stopPropagationHandler}
							>
								{isJustStringTitle
									? 'Learn more.'
									: 'Check the documentation to learn more.'}
							</a>
						</div>
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
				<TooltipSimple
					title={<div onClick={stopPropagationHandler}>{tooltip}</div>}
				>
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
