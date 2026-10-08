import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { Compass } from '@signozhq/icons';
import { TextNoData } from '../../../components/TextNoData';
import { Link } from 'react-router-dom';

import { InfraMonitoringEntity } from '../../../constants';
import { getDrawerDurationMs } from '../../useDrawerLifecycleStore';
import { buildK8sListNavigationUrl } from '../../utils';
import styles from './EntityCountsSection.module.scss';
import { logInfraExplorerNavigatedEvent } from 'container/InfraMonitoringK8sV2/Base/events';

export interface EntityCountConfig<T> {
	label: string;
	getValue: (entity: T) => number;
	targetCategory: InfraMonitoringEntity;
}

interface EntityCountsSectionProps<T> {
	entity: T;
	countsConfig: EntityCountConfig<T>[];
	selectedItem: string;
	filterExpression: string;
	closeDrawer: () => void;
	entityType: InfraMonitoringEntity;
	activeTab: string;
}

export function EntityCountsSection<T>({
	entity,
	countsConfig,
	selectedItem,
	filterExpression,
	closeDrawer,
	entityType,
	activeTab,
}: EntityCountsSectionProps<T>): JSX.Element {
	const handleCardNavigate = (cardLabel: string): void => {
		logInfraExplorerNavigatedEvent({
			entityType,
			destination: 'k8s_list',
			source: 'stats_card',
			tab: activeTab,
			sourceKey: cardLabel,
			drawerDurationMsAtNavigation: getDrawerDurationMs(),
		});
		closeDrawer();
	};

	return (
		<div className={styles.countsContainer}>
			{countsConfig.map((config) => (
				<div
					key={config.label}
					className={styles.countCard}
					data-testid={`count-card-${config.label.toLowerCase().replace(/\s+/g, '-')}`}
				>
					<Typography.Text
						color="muted"
						size="small"
						weight="medium"
						className={styles.countLabel}
					>
						{config.label}
					</Typography.Text>
					{config.getValue(entity) ? (
						<Typography.Text
							className={styles.countValue}
							size="xl"
							weight="semibold"
						>
							{config.getValue(entity)}
						</Typography.Text>
					) : (
						<TextNoData type="typography" className={styles.countValue} />
					)}
					<Link
						to={buildK8sListNavigationUrl(config.targetCategory, filterExpression)}
						onClick={(): void => handleCardNavigate(config.label)}
						data-testid={`navigate-${config.label.toLowerCase().replace(/\s+/g, '-')}`}
					>
						<TooltipSimple
							title={`View ${config.label.toLowerCase()} of '${selectedItem}'`}
							side="top"
							arrow
						>
							<Button
								size="icon"
								variant="ghost"
								color="secondary"
								className={styles.navigateButton}
								prefix={<Compass size={14} />}
							/>
						</TooltipSimple>
					</Link>
				</div>
			))}
		</div>
	);
}
