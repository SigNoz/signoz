import { useLayoutEffect } from 'react';

import AskNoz from './AskNoz/AskNoz';
import LeftSlot from './LeftSlot/LeftSlot';
import { useBottomStripStore } from './store/useBottomStripStore';
import StripHeightPill from './StripHeightPill/StripHeightPill';
import SupportButton from './SupportButton/SupportButton';

import styles from './BottomStrip.module.scss';

export const BOTTOM_STRIP_ON_CLASS = 'bottom-strip-on';
export const BOTTOM_STRIP_HEIGHT_VAR = '--bottom-strip-height';

function BottomStrip(): JSX.Element {
	const height = useBottomStripStore((s) => s.height);

	useLayoutEffect(() => {
		document.body.classList.add(BOTTOM_STRIP_ON_CLASS);
		document.body.style.setProperty(BOTTOM_STRIP_HEIGHT_VAR, `${height}px`);

		return (): void => {
			document.body.classList.remove(BOTTOM_STRIP_ON_CLASS);
			document.body.style.removeProperty(BOTTOM_STRIP_HEIGHT_VAR);
		};
	}, [height]);

	return (
		<>
			<div className={styles.strip} data-testid="bottom-strip">
				<div className={styles.left}>
					<LeftSlot />
				</div>
				<div className={styles.right}>
					<AskNoz />
					<SupportButton />
				</div>
			</div>
			<StripHeightPill />
		</>
	);
}

export default BottomStrip;
