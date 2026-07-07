import { Group, Info } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './EntityGroupHeader.module.scss';

const DOCS_BASE_URL = `${process.env.DOCS_BASE_URL}/docs`;

interface EntityGroupHeaderProps {
	title: string;
	icon?: React.ReactNode;
	docPath?: string;
	tooltip?: string;
}

function EntityGroupHeader({
	title,
	icon,
	docPath,
	tooltip,
}: EntityGroupHeaderProps): JSX.Element {
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
					<span className={styles.infoIcon}>
						<Info size="md" />
					</span>
				</TooltipSimple>
			);
		}

		if (tooltip) {
			return (
				<TooltipSimple title={tooltip}>
					<span className={styles.infoIcon}>
						<Info size="md" />
					</span>
				</TooltipSimple>
			);
		}

		return null;
	};

	return (
		<div className={styles.entityGroupHeader} data-slot="entity-group-header">
			<span data-slot="icon">
				{icon || <Group size={14} data-hide-expanded="true" />}
			</span>{' '}
			{title}
			{renderInfoIcon()}
		</div>
	);
}

export default EntityGroupHeader;
