import { Plus, Route } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './RoutingPolicies.module.scss';

const DOCS_URL = 'https://signoz.io/docs/alerts-management/routing-policy';

interface RoutingPoliciesEmptyStateProps {
	canCreate: boolean;
	onCreate: () => void;
}

function RoutingPoliciesEmptyState({
	canCreate,
	onCreate,
}: RoutingPoliciesEmptyStateProps): JSX.Element {
	return (
		<div className={styles.emptyState} data-testid="routing-policies-empty-state">
			<Route className={styles.emptyIcon} size={16} />
			<Typography
				variant="paragraph"
				size="medium"
				weight="medium"
				color="main"
				as="span"
				textOverflow="wrap"
			>
				No routing policies yet
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="p"
				maxWidth={420}
				textOverflow="wrap"
			>
				A routing policy sends alerts matching an expression to the channels you
				pick, without editing each alert rule.
			</Typography>
			{canCreate && (
				<Button
					variant="solid"
					color="primary"
					size="md"
					prefix={<Plus size={14} />}
					onClick={onCreate}
					testId="routing-policies-empty-create"
				>
					New routing policy
				</Button>
			)}
			<a
				className={styles.docsLink}
				href={DOCS_URL}
				target="_blank"
				rel="noopener noreferrer"
			>
				Read the routing policy guide
			</a>
		</div>
	);
}

export default RoutingPoliciesEmptyState;
