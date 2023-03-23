export type ListMarkerProps = {
	isDisabled: boolean;
	labelName: string;
	index: number;
	className?: string;
	isAvailableToDisable: boolean;
	toggleDisabled: (index: number) => void;
};
