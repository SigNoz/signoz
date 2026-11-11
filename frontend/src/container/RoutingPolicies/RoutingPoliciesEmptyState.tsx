import { Plus, Route } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { ROUTE_POLICY_CREATE_CHECKS } from 'hooks/routingPolicies/useRoutePolicyCollectionPermissions';

import styles from './RoutingPolicies.module.scss';

const DOCS_URL = 'https://signoz.io/docs/alerts-management/routing-policy';

interface RoutingPoliciesEmptyStateProps {
	onCreate: () => void;
}

function RoutingPoliciesEmptyState({
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
			<AuthZButton
				checks={ROUTE_POLICY_CREATE_CHECKS}
				variant="solid"
				color="primary"
				size="md"
				prefix={<Plus size={14} />}
				onClick={onCreate}
				testId="routing-policies-empty-create"
			>
				New routing policy
			</AuthZButton>
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
