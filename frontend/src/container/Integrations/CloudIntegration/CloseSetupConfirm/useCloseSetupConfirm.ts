import { useCallback, useState } from 'react';

interface UseCloseSetupConfirmProps {
	/** True once closing would lose a pending setup, i.e. a setup command exists. */
	shouldConfirm: boolean;
	onClose: () => void;
}

interface UseCloseSetupConfirm {
	isConfirmOpen: boolean;
	setIsConfirmOpen: (open: boolean) => void;
	requestClose: () => void;
}

export function useCloseSetupConfirm({
	shouldConfirm,
	onClose,
}: UseCloseSetupConfirmProps): UseCloseSetupConfirm {
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	const requestClose = useCallback((): void => {
		if (shouldConfirm) {
			setIsConfirmOpen(true);
			return;
		}
		onClose();
	}, [shouldConfirm, onClose]);

	return { isConfirmOpen, setIsConfirmOpen, requestClose };
}
