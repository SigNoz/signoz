import { Button, ButtonProps } from '@signozhq/button';
import { Tooltip, TooltipProvider } from '@signozhq/tooltip';
import { cn } from 'lib/cn';

export type ButtonWithTooltipProps = ButtonProps & {
	tooltipTitle?: string;
	tooltipDisabled?: boolean;
};

export function ButtonWithTooltip({
	children,
	tooltipTitle,
	tooltipDisabled,
	onClick,
	disabled,
	...props
}: ButtonWithTooltipProps): JSX.Element {
	if (tooltipDisabled || !tooltipTitle) {
		return <Button {...props}>{children}</Button>;
	}

	if (disabled) {
		return (
			<TooltipProvider>
				<Tooltip title={tooltipTitle}>
					<Button
						{...props}
						className={cn('disabled:pointer-events-auto', props.className)}
						disabled={disabled}
					>
						{children}
					</Button>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return (
		<TooltipProvider>
			<Tooltip title={tooltipTitle}>
				<Button {...props} onClick={onClick} disabled={disabled}>
					{children}
				</Button>
			</Tooltip>
		</TooltipProvider>
	);
}
