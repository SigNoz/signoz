import { PropsWithChildren } from 'react';

export type ListItemWrapperProps = PropsWithChildren & { onDelete: () => void };
