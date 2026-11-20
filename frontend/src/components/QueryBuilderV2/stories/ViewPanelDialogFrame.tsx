import { type ReactNode, useRef, useState } from 'react';
import { Dialog } from '@signozhq/ui/dialog';
import { ConfigProvider } from 'antd';

import styles from './ViewPanelDialogFrame.module.scss';

interface ViewPanelDialogFrameProps {
	children: ReactNode;
}

/**
 * The view panel dialog around the builder: same surface, same popup container.
 * It portals into the canvas, so plays still find it with `within(canvasElement)`.
 */
function ViewPanelDialogFrame({
	children,
}: ViewPanelDialogFrameProps): JSX.Element {
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const surfaceRef = useRef<HTMLDivElement>(null);

	return (
		<div ref={setContainer}>
			{container && (
				<Dialog
					open
					onClose={(): void => {}}
					container={container}
					title="Request rate - (View mode)"
					width="full"
					testId="view-panel-dialog-frame"
				>
					<div ref={surfaceRef} className={styles.surface}>
						<ConfigProvider
							getPopupContainer={(): HTMLElement =>
								surfaceRef.current ?? document.body
							}
						>
							<div className={styles.content}>{children}</div>
						</ConfigProvider>
					</div>
				</Dialog>
			)}
		</div>
	);
}

export default ViewPanelDialogFrame;
