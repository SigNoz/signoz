import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './NoRuleEmptyState.module.scss';

interface NoRuleEmptyStateProps {
	canManage: boolean;
	onSetup: () => void;
}

function NoRuleEmptyState({
	canManage,
	onSetup,
}: NoRuleEmptyStateProps): JSX.Element {
	return (
		<div className={styles.emptyState} data-testid="volume-control-empty">
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				No volume control rule. All series are retained. Aggregate away
				high-cardinality attributes to reduce cost.
			</Typography>
			{canManage && (
				<Button
					size="md"
					variant="solid"
					color="primary"
					onClick={onSetup}
					testId="volume-control-setup"
				>
					Set up volume control
				</Button>
			)}
		</div>
	);
}

export default NoRuleEmptyState;
