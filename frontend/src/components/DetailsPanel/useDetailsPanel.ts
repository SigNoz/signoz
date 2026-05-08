import { useCallback, useEffect, useRef, useState } from 'react';

import { DetailsPanelState, UseDetailsPanelOptions } from './types';

function useDetailsPanel({
	entityId,
	onClose,
}: UseDetailsPanelOptions): DetailsPanelState {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const prevEntityIdRef = useRef<string>('');

	useEffect(() => {
		const currentId = entityId || '';
		if (currentId && currentId !== prevEntityIdRef.current) {
			setIsOpen(true);
		}
		prevEntityIdRef.current = currentId;
	}, [entityId]);

	const open = useCallback(() => setIsOpen(true), []);
	const close = useCallback(() => {
		setIsOpen(false);
		onClose?.();
	}, [onClose]);

	return { isOpen, open, close };
}

export default useDetailsPanel;
