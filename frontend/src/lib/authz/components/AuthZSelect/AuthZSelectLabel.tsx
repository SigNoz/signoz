import type { ReactNode } from 'react';
import { Tooltip } from '@signozhq/ui/tooltip';

import { deniedReason } from '../deniedTooltip';

interface AuthZSelectLabelProps {
	reason?: string;
	denied: boolean;
	children: ReactNode;
}

function AuthZSelectLabel({
	reason,
	denied,
	children,
}: AuthZSelectLabelProps): JSX.Element {
	if (!reason) {
		return <span>{children}</span>;
	}

	return (
		<Tooltip title={denied ? deniedReason(reason) : reason}>
			<span>{children}</span>
		</Tooltip>
	);
}

export default AuthZSelectLabel;
