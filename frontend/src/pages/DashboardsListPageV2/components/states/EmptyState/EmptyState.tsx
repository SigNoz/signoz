import { ReactNode } from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { ArrowUpRight } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';

import dashboardsUrl from '@/assets/Icons/dashboards.svg';

import styles from './EmptyState.module.scss';
import { openInNewTab } from 'utils/navigation';

interface Props {
	createDropdown?: ReactNode;
}

const LEARN_MORE_HREF =
	'https://signoz.io/docs/userguide/manage-dashboards?utm_source=product&utm_medium=dashboard-list-empty-state';

function EmptyState({ createDropdown }: Props): JSX.Element {
	return (
		<div className={styles.wrapper}>
			<img src={dashboardsUrl} alt="dashboards" className={styles.image} />
			<section className={styles.copy}>
				<Typography.Text className={styles.noDashboard}>
					No dashboards yet.{' '}
				</Typography.Text>
				<Typography.Text className={styles.info}>
					Create a dashboard to start visualizing your data
				</Typography.Text>
			</section>

			{createDropdown ? (
				<section className={styles.actions}>
					{createDropdown}
					<Button
						variant="link"
						color="primary"
						className={styles.learnMore}
						testId="learn-more"
						onClick={(): void => {
							logEvent('Dashboard List: Learn more clicked', {});
							openInNewTab(LEARN_MORE_HREF);
						}}
					>
						Learn more
					</Button>
					<ArrowUpRight size={16} className={styles.learnMoreArrow} />
				</section>
			) : null}
		</div>
	);
}

export default EmptyState;
