import { Button } from '@signozhq/ui/button';
import { Tooltip, TooltipProvider } from '@signozhq/ui/tooltip';
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
		<TooltipProvider>
			<Tooltip title={tooltipTitle}>
				<span>
					<Button
						color="secondary"
						variant="ghost"
						size="icon"
						aria-label={ariaLabel}
						disabled={disabled}
						className="mcp-copy-btn"
						prefix={<Copy size={14} />}
						onClick={onCopy}
					/>
				</span>
			</Tooltip>
		</TooltipProvider>
	);
}

export default CopyIconButton;
