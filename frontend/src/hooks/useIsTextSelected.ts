import { useCallback } from 'react';

export function useIsTextSelected(): () => boolean {
	return useCallback((): boolean => {
		const selection = window.getSelection();
		return (
			!!selection && !selection.isCollapsed && selection.toString().length > 0
		);
	}, []);
}
