import { forwardRef } from 'react';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';

import { SavedViewsRowButtonProps } from './types';

// forwardRef and rest props so a menu can use it as its trigger.
const SavedViewsRowButton = forwardRef<
	HTMLButtonElement,
	SavedViewsRowButtonProps
>(function SavedViewsRowButton(
	{ icon, label, tooltip, testId, onClick, ...triggerProps },
	ref,
): JSX.Element {
	const button = (
		<Button
			ref={ref}
			variant="link"
			color="secondary"
			size="sm"
			icon
			aria-label={label}
			onClick={onClick}
			{...triggerProps}
			testId={testId}
		>
			{icon}
		</Button>
	);

	return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
});

export default SavedViewsRowButton;
