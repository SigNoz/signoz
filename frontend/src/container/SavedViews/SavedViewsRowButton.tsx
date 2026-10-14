import { forwardRef } from 'react';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import { SavedViewsRowButtonProps } from './types';

import styles from './SavedViewsList.module.scss';

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
			className={styles.rowButton}
			aria-label={label}
			onClick={onClick}
			{...triggerProps}
			data-testid={testId}
		>
			{icon}
		</Button>
	);

	return tooltip ? (
		<TooltipSimple title={tooltip}>{button}</TooltipSimple>
	) : (
		button
	);
});

export default SavedViewsRowButton;
