import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { DEFAULT_PIN_TOOLTIP_KEY } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { X } from 'lucide-react';

import Kbd from '../Kbd/Kbd';

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
	const isDarkMode = useIsDarkMode();

	return (
		<div
			className={cx(
				Styles.footer,
				!isDarkMode && Styles.lightMode,
				isPinned && Styles.footerPinned,
			)}
			role="status"
			data-testid="uplot-tooltip-footer"
		>
			<div className={Styles.hint}>
				{isPinned ? (
					<>
						<span>Press</span>
						<Kbd isPinned>{pinKey.toUpperCase()}</Kbd>
						<span>or</span>
						<Kbd isPinned>Esc</Kbd>
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
				<button
					type="button"
					className={Styles.unpinButton}
					onClick={dismiss}
					aria-label="Unpin tooltip"
					data-testid="uplot-tooltip-unpin"
				>
					<X size={10} />
					<span>Unpin</span>
				</button>
			)}
		</div>
	);
}
