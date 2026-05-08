export interface DetailsPanelState {
	isOpen: boolean;
	open: () => void;
	close: () => void;
}

export interface UseDetailsPanelOptions {
	entityId: string | undefined;
	onClose?: () => void;
}
