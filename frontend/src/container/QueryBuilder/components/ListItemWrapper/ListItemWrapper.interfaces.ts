import type { ReactNode } from 'react';

export type ListItemWrapperProps = {
	onDelete: () => void;
	children: ReactNode;
};
