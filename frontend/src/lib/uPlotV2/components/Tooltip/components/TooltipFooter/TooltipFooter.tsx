import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { X } from 'lucide-react';

import Kbd from '../Kbd/Kbd';

import Styles from './TooltipFooter.module.scss';

interface TooltipFooterProps {
	isPinned: boolean;
	dismiss: () => void;
}

export default function TooltipFooter({
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
						<Kbd isPinned>L</Kbd>
						<span>or</span>
						<Kbd isPinned>Esc</Kbd>
						<span>to unlock</span>
					</>
				) : (
					<>
						<span>Press</span>
						<Kbd>L</Kbd>
						<span>to lock</span>
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
