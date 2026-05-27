import { createShortcutActions } from '../../constants/shortcutActions';
import { useCmdK } from '../../providers/cmdKProvider';
import { ROLES } from '../../types/roles';
import { ShiftOverlay } from './ShiftOverlay';
import { useShiftHoldOverlay } from './useShiftHoldOverlay';

export function ShiftHoldOverlayController({
	userRole,
}: {
	userRole: ROLES;
}): JSX.Element | null {
	const { open: isCmdKOpen } = useCmdK();
	const noop = (): void => undefined;

	const actions = createShortcutActions({
		navigate: noop,
		// Overlay is read-only — actions never fire — so we only need a no-op
		// that satisfies the typed signature.
		handleThemeChange: (): void => undefined,
	});

	const visible = useShiftHoldOverlay({
		isModalOpen: isCmdKOpen,
	});

	return (
		<ShiftOverlay visible={visible} actions={actions} userRole={userRole} />
	);
}
