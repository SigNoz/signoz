import { SquareArrowOutUpRight } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import type { ReactNode } from 'react';

import styles from './ConfigActions.module.scss';

interface ConfigActionRowProps {
	/** Leading glyph for the action. */
	icon: ReactNode;
	label: string;
	onClick: () => void;
	testId?: string;
}

/**
 * One row in the config pane's "Actions" list — a cross-page navigation link
 * (leading icon, label, trailing external-link affordance). The whole row is the
 * click target.
 */
function ConfigActionRow({
	icon,
	label,
	onClick,
	testId,
}: ConfigActionRowProps): JSX.Element {
	return (
		<Button
			size="md"
			type="button"
			variant="outlined"
			color="secondary"
			width="100%"
			testId={testId}
			onClick={onClick}
			prefix={<span className={styles.icon}>{icon}</span>}
			suffix={<SquareArrowOutUpRight size={14} />}
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="visible"
			>
				{label}
			</Typography>
		</Button>
	);
}

export default ConfigActionRow;
