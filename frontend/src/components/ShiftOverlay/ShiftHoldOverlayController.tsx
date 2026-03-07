import { createShortcutActions } from '../../constants/shortcutActions';
import { useCmdK } from '../../providers/cmdKProvider';
import { ShiftOverlay } from './ShiftOverlay';
import { useShiftHoldOverlay } from './useShiftHoldOverlay';

type UserRole = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'VIEWER';
export function ShiftHoldOverlayController({
	userRole,
}: {
	userRole: UserRole;
}): JSX.Element | null {
	const { open: isCmdKOpen } = useCmdK();
	const noop = (): void => undefined;

	const actions = createShortcutActions({
		navigate: noop,
		handleThemeChange: noop,
	});

	const visible = useShiftHoldOverlay({
		isModalOpen: isCmdKOpen,
	});

	return (
		<ShiftOverlay visible={visible} actions={actions} userRole={userRole} />
	);
}
