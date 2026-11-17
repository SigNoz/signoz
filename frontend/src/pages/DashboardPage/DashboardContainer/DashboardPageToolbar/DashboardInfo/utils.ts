// Without a toggle, say why it can't be toggled rather than only restating the
// lock state.
export function getLockTooltip({
	isLocked,
	canToggle,
	disabledReason,
}: {
	isLocked: boolean;
	canToggle: boolean;
	disabledReason?: string;
}): string {
	if (canToggle) {
		return isLocked ? 'Locked — click to unlock' : 'Unlocked — click to lock';
	}
	if (disabledReason) {
		return disabledReason;
	}
	return isLocked ? 'This dashboard is locked' : 'This dashboard is unlocked';
}
