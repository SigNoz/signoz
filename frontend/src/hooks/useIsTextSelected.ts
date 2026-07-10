export function useIsTextSelected(): () => boolean {
	return (): boolean => {
		const selection = window.getSelection();
		return (
			!!selection && !selection.isCollapsed && selection.toString().length > 0
		);
	};
}
