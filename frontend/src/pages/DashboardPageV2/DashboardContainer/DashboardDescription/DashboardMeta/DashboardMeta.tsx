import { Badge } from '@signozhq/ui/badge';
import { isEmpty } from 'lodash-es';

import styles from '../DashboardDescription.module.scss';

interface DashboardMetaProps {
	tags: string[];
	description: string;
}

function DashboardMeta({ tags, description }: DashboardMetaProps): JSX.Element {
	return (
		<>
			{tags.length > 0 && (
				<div className={styles.dashboardTags}>
					{tags.map((tag) => (
						<Badge key={tag} className={styles.tag}>
							{tag}
						</Badge>
					))}
				</div>
			)}
			{!isEmpty(description) && (
				<section className={styles.dashboardDescriptionSection}>
					{description}
				</section>
			)}
		</>
	);
}

export default DashboardMeta;
