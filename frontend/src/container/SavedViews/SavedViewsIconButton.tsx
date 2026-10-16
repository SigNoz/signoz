import { forwardRef } from 'react';
import { Button, type VariantColorType } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';

import { SavedViewsIconButtonProps } from './types';

// Ghost buttons only come in secondary, so the warning tone is a link button.
const VARIANT_COLORS: Record<
	NonNullable<SavedViewsIconButtonProps['color']>,
	VariantColorType
> = {
	secondary: { variant: 'ghost', color: 'secondary' },
	warning: { variant: 'link', color: 'warning' },
};

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
		disabledTooltip,
		checks,
		onClick,
		...triggerProps
	},
	ref,
): JSX.Element {
	if (checks?.length) {
		return (
			<Tooltip title={title}>
				<AuthZButton
					checks={checks}
					{...VARIANT_COLORS[color]}
					size="sm"
					icon
					aria-label={title}
					disabled={disabled}
					// AuthZButton skips its checks while a block reason is set.
					disabledTooltip={disabled ? disabledTooltip : undefined}
					onClick={onClick}
					testId={testId}
				>
					{icon}
				</AuthZButton>
			</Tooltip>
		);
	}

	return (
		<Tooltip title={title}>
			<Button
				ref={ref}
				{...VARIANT_COLORS[color]}
				size="sm"
				icon
				aria-label={title}
				disabled={disabled}
				disabledTooltip={disabledTooltip}
				onClick={onClick}
				{...triggerProps}
				testId={testId}
			>
				{icon}
			</Button>
		</Tooltip>
	);
});

export default SavedViewsIconButton;
