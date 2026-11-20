import { type ReactNode, useRef } from 'react';
import {
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@signozhq/ui/dialog';
import { ConfigProvider } from 'antd';

import styles from './ViewPanelDialogFrame.module.scss';

interface ViewPanelDialogFrameProps {
	children: ReactNode;
}

/**
 * The view panel dialog around the builder: same size, same popup container.
 * It portals into the body, so plays find it with `screen`.
 */
function ViewPanelDialogFrame({
	children,
}: ViewPanelDialogFrameProps): JSX.Element {
	const contentRef = useRef<HTMLDivElement>(null);

	return (
		<Dialog open>
			<DialogContent
				ref={contentRef}
				position="center"
				width="extra-wide"
				className={styles.dialog}
				testId="view-panel-dialog-frame"
			>
				<DialogHeader>
					<DialogTitle>Request rate - (View mode)</DialogTitle>
				</DialogHeader>
				<DialogCloseButton />
				<ConfigProvider
					getPopupContainer={(): HTMLElement => contentRef.current ?? document.body}
				>
					<div className={styles.content}>{children}</div>
				</ConfigProvider>
			</DialogContent>
		</Dialog>
	);
}

export default ViewPanelDialogFrame;
