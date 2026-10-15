import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Copy } from '@signozhq/icons';

interface CopyIconButtonProps {
	ariaLabel: string;
	onCopy: () => void;
	disabled?: boolean;
	disabledTooltip?: string;
}

function CopyIconButton({
	ariaLabel,
	onCopy,
	disabled = false,
	disabledTooltip,
}: CopyIconButtonProps): JSX.Element {
	return (
		<Tooltip title={disabled ? undefined : 'Copy to clipboard'}>
			<Button
				color="secondary"
				variant="ghost"
				size="sm"
				icon
				aria-label={ariaLabel}
				disabled={disabled}
				disabledTooltip={disabledTooltip}
				onClick={onCopy}
			>
				<Copy size={14} />
			</Button>
		</Tooltip>
	);
}

export default CopyIconButton;
