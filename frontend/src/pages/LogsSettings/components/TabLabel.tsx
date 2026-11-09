import { Typography } from '@signozhq/ui/typography';
import { useAppLocation } from 'lib/router/useAppLocation';

import { TableLabel } from '../types';

function TabLabel({ routeKey, label }: TableLabel): JSX.Element {
	const { pathname } = useAppLocation();

	if (pathname === routeKey) {
		return (
			<Typography.Link
				/* TODO(typography): a link with no href renders plain text: a click that does not navigate is a Button with variant="link" */ variant="paragraph"
				size="base"
				weight="regular"
				textOverflow="wrap"
			>
				{label}
			</Typography.Link>
		);
	}

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

export default TabLabel;
