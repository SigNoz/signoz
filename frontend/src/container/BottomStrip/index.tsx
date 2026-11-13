import { useLayoutEffect } from 'react';

import AskNoz from './AskNoz/AskNoz';
import LeftSlot from './LeftSlot/LeftSlot';
import { useBottomStripStore } from './store/useBottomStripStore';
import SupportButton from './SupportButton/SupportButton';

import styles from './BottomStrip.module.scss';

export const BOTTOM_STRIP_HEIGHT = 24;

export const BOTTOM_STRIP_ON_CLASS = 'bottom-strip-on';
/** Strip height plus whatever sits in its top slot. */
export const BOTTOM_STRIP_HEIGHT_VAR = '--bottom-strip-height';

function BottomStrip(): JSX.Element {
	const topSlot = useBottomStripStore((s) => s.topSlot);
	const setTopSlot = useBottomStripStore((s) => s.setTopSlot);

	useLayoutEffect(() => {
		const publish = (): void => {
			document.body.style.setProperty(
				BOTTOM_STRIP_HEIGHT_VAR,
				`${BOTTOM_STRIP_HEIGHT + (topSlot?.offsetHeight ?? 0)}px`,
			);
		};

		document.body.classList.add(BOTTOM_STRIP_ON_CLASS);
		publish();

		const observer =
			topSlot && typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(publish)
				: null;
		if (topSlot) {
			observer?.observe(topSlot);
		}

		return (): void => {
			observer?.disconnect();
			document.body.classList.remove(BOTTOM_STRIP_ON_CLASS);
			document.body.style.removeProperty(BOTTOM_STRIP_HEIGHT_VAR);
		};
	}, [topSlot]);

	return (
		<>
			<div
				ref={setTopSlot}
				className={styles.topSlot}
				data-testid="bottom-strip-top-slot"
			/>
			<div
				className={styles.strip}
				style={{ height: BOTTOM_STRIP_HEIGHT }}
				data-testid="bottom-strip"
			>
				<div className={styles.left}>
					<LeftSlot />
				</div>
				<div className={styles.right}>
					<AskNoz />
					<SupportButton />
				</div>
			</div>
		</>
	);
}

export default BottomStrip;
