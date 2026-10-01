import { forwardRef } from 'react';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

import { SavedViewsIconButtonProps } from './types';

// forwardRef and rest props so a menu can use it as its trigger.
const SavedViewsIconButton = forwardRef<
	HTMLButtonElement,
	SavedViewsIconButtonProps
>(function SavedViewsIconButton(
	{
		title,
		icon,
		testId,
		color = 'secondary',
		disabled,
		checks,
		onClick,
		...triggerProps
	},
	ref,
): JSX.Element {
	const { deniedPermissions } = useAuthZ(checks ?? [], {
		enabled: !!checks?.length,
	});

	const button = (
		<Button
			ref={ref}
			variant="ghost"
			color={color}
			size="icon"
			aria-label={title}
			prefix={icon}
			disabled={disabled}
			onClick={onClick}
			{...triggerProps}
			data-testid={testId}
		/>
	);

	if (checks && deniedPermissions.length > 0) {
		return <AuthZTooltip checks={checks}>{button}</AuthZTooltip>;
	}
	return <TooltipSimple title={title}>{button}</TooltipSimple>;
});

export default SavedViewsIconButton;
