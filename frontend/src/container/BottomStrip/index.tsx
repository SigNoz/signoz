import { useLayoutEffect } from 'react';
import { useAppContext } from 'providers/App/App';

import AskNoz from './AskNoz/AskNoz';

import styles from './BottomStrip.module.scss';

export const BOTTOM_STRIP_HEIGHT = 24;

export const BOTTOM_STRIP_ON_CLASS = 'bottom-strip-on';
export const BOTTOM_STRIP_HEIGHT_VAR = '--bottom-strip-height';

function BottomStrip(): JSX.Element {
	const { versionData } = useAppContext();
	const version = versionData?.version?.trim();

	useLayoutEffect(() => {
		document.body.classList.add(BOTTOM_STRIP_ON_CLASS);
		document.body.style.setProperty(
			BOTTOM_STRIP_HEIGHT_VAR,
			`${BOTTOM_STRIP_HEIGHT}px`,
		);

		return (): void => {
			document.body.classList.remove(BOTTOM_STRIP_ON_CLASS);
			document.body.style.removeProperty(BOTTOM_STRIP_HEIGHT_VAR);
		};
	}, []);

	return (
		<div className={styles.strip} data-testid="bottom-strip">
			<div className={styles.left}>
				{version && (
					<span className={styles.version} data-testid="bottom-strip-version">
						{version}
					</span>
				)}
			</div>
			<div className={styles.right}>
				<AskNoz />
			</div>
		</div>
	);
}

export default BottomStrip;
