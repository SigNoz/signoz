import { CSSProperties } from 'react';

export type ListMarkerProps = {
	isDisabled: boolean;
	labelName: string;
	index: number;
	className?: string;
	isAvailableToDisable: boolean;
	toggleDisabled: (index: number) => void;
	style?: CSSProperties;
};
