import { Button } from '@signozhq/ui';
import { Kbd } from '@signozhq/ui';
import { DEFAULT_PIN_TOOLTIP_KEY } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { X } from 'lucide-react';

import Styles from './TooltipFooter.module.scss';

interface TooltipFooterProps {
	pinKey?: string;
	isPinned: boolean;
	dismiss: () => void;
}

export default function TooltipFooter({
	pinKey = DEFAULT_PIN_TOOLTIP_KEY,
	isPinned,
	dismiss,
}: TooltipFooterProps): JSX.Element {
	return (
		<div
			className={Styles.footer}
			role="status"
			data-testid="uplot-tooltip-footer"
		>
			<div className={Styles.hint}>
				{isPinned ? (
					<>
						<span>Press</span>
						<Kbd active>{pinKey.toUpperCase()}</Kbd>
						<span>or</span>
						<Kbd active>Esc</Kbd>
						<span>to unpin</span>
					</>
				) : (
					<>
						<span>Press</span>
						<Kbd>{pinKey.toUpperCase()}</Kbd>
						<span>to pin the tooltip</span>
					</>
				)}
			</div>

			{isPinned && (
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					onClick={dismiss}
					aria-label="Unpin tooltip"
					data-testid="uplot-tooltip-unpin"
				>
					<X size={10} />
					<span>Unpin</span>
				</Button>
			)}
		</div>
	);
}
