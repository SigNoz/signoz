import { forwardRef } from 'react';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';

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
		onClick,
		...triggerProps
	},
	ref,
): JSX.Element {
	return (
		<TooltipSimple title={title}>
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
		</TooltipSimple>
	);
});

export default SavedViewsIconButton;
