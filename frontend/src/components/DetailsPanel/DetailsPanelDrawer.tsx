import { ReactNode } from 'react';
import { Drawer } from '@signozhq/ui/drawer';

interface DetailsPanelDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	headerSuffix?: ReactNode;
	loading?: boolean;
	testId?: string;
}

function DetailsPanelDrawer({
	isOpen,
	onClose,
	title,
	children,
	headerSuffix,
	loading,
	testId,
}: DetailsPanelDrawerProps): JSX.Element {
	return (
		<Drawer
			type="inspector"
			stack="overlay"
			open={isOpen}
			onClose={onClose}
			title={title}
			width="extra-wide"
			closePosition="start"
			headerSuffix={headerSuffix}
			loading={loading}
			testId={testId}
		>
			{children}
		</Drawer>
	);
}

DetailsPanelDrawer.defaultProps = {
	headerSuffix: undefined,
	loading: false,
	testId: undefined,
};

export default DetailsPanelDrawer;
