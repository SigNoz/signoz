import { Button } from '@signozhq/ui';
import { Kbd } from '@signozhq/ui';
import { DEFAULT_PIN_TOOLTIP_KEY } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { X } from 'lucide-react';

import Styles from './TooltipFooter.module.scss';
import { MousePointerClick } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';

interface TooltipFooterProps {
	id: string;
	pinKey?: string;
	isPinned: boolean;
	canDrilldown?: boolean;
	dismiss: () => void;
}

export default function TooltipFooter({
	id,
	pinKey = DEFAULT_PIN_TOOLTIP_KEY,
	isPinned,
	canDrilldown = true,
	dismiss,
}: TooltipFooterProps): JSX.Element {
	const handleUnpinClick = (): void => {
		logEvent(Events.TOOLTIP_UNPINNED, {
			id: id,
		});
		dismiss();
	};
	return (
		<div
			className={Styles.footer}
			role="status"
			data-testid="uplot-tooltip-footer"
		>
			<div>
				{isPinned ? (
					<div className={Styles.hint}>
						<span>Press</span>
						<Kbd active>{pinKey.toUpperCase()}</Kbd>
						<span>or</span>
						<Kbd active>Esc</Kbd>
						<span>to unpin</span>
					</div>
				) : (
					<div className={Styles.hintList}>
						{canDrilldown && (
							<div className={Styles.hint} data-active="false">
								<Kbd>
									<MousePointerClick size={12} />
								</Kbd>
								<span>Click to drilldown</span>
							</div>
						)}
						<div className={Styles.hint} data-active="false">
							<span>Press</span>
							<Kbd>{pinKey.toUpperCase()}</Kbd>
							<span>to pin the tooltip</span>
						</div>
					</div>
				)}
			</div>

			{isPinned && (
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					onClick={handleUnpinClick}
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
