import { MouseEvent, ReactNode } from 'react';

export type HavingFilterTagProps = {
	label: ReactNode;
	value: string;
	disabled: boolean;
	onClose: (event?: MouseEvent<HTMLElement, MouseEvent>) => void;
	closable: boolean;
	onUpdate: (value: string) => void;
};

export type HavingTagRenderProps = Omit<HavingFilterTagProps, 'onUpdate'>;
