import { Typography } from '@signozhq/ui/typography';

import styles from './AIThreadMessage.module.scss';

interface RoleLabelProps {
	label: string;
}

function RoleLabel({ label }: RoleLabelProps): JSX.Element {
	return (
		<Typography.Text size="base" weight="normal" className={styles.roleLabel}>
			{label}
		</Typography.Text>
	);
}

export default RoleLabel;
