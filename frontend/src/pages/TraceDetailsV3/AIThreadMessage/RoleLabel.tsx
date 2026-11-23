import { Typography } from '@signozhq/ui/typography';

interface RoleLabelProps {
	label: string;
}

function RoleLabel({ label }: RoleLabelProps): JSX.Element {
	return (
		<Typography
			variant="paragraph"
			size="base"
			weight="regular"
			color="inherit"
			as="span"
			textOverflow="wrap"
		>
			{label}
		</Typography>
	);
}

export default RoleLabel;
