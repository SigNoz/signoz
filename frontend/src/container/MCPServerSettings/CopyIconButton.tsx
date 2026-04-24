import { useTranslation } from 'react-i18next';
import { Button, Tooltip, TooltipProvider } from '@signozhq/ui';
import { Copy } from 'lucide-react';
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
	const { t } = useTranslation('mcpServer');
	const tooltipTitle = disabled
		? t('copy_tooltip_disabled')
		: t('copy_tooltip_enabled');

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
