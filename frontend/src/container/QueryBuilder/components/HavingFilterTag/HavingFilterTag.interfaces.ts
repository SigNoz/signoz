import { ReactNode } from 'react';

export type HavingFilterTagProps = {
	label: ReactNode;
	value: string;
	disabled: boolean;
	onClose: VoidFunction;
	closable: boolean;
	onUpdate: (value: string) => void;
};

export type HavingTagRenderProps = Omit<HavingFilterTagProps, 'onUpdate'>;
