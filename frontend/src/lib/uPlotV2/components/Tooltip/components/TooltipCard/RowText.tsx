import type { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

/** A tooltip row's label or value: code text in the row's colour, cut with an ellipsis. */
export default function RowText({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	return (
		<Typography
			variant="code"
			size="small"
			weight="regular"
			color="inherit"
			as="span"
			display="block"
			textOverflow="ellipsis"
			tabularNumbers
		>
			{children}
		</Typography>
	);
}
