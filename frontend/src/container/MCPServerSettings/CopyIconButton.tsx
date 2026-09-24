import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Copy } from '@signozhq/icons';
import './CopyIconButton.styles.scss';

interface CopyIconButtonProps {
	ariaLabel: string;
	onCopy: () => void;
	disabled?: boolean;
}

function CopyIconButton({
	ariaLabel,
	onCopy,
	disabled = false,
}: CopyIconButtonProps): JSX.Element {
	const tooltipTitle = disabled
		? 'Enter your Cloud region first'
		: 'Copy to clipboard';

	return (
		<Tooltip title={tooltipTitle}>
			<span>
				<Button
					disabledTooltip={undefined}
					color="secondary"
					variant="ghost"
					size="sm"
					icon
					aria-label={ariaLabel}
					disabled={disabled}
					className="mcp-copy-btn"
					onClick={onCopy}
				>
					<Copy size={14} />
				</Button>
			</span>
		</Tooltip>
	);
}

export default CopyIconButton;
