import { PropsWithChildren } from 'react';

type CommonProps = PropsWithChildren<{
	className?: string;
	minSize?: number;
	maxSize?: number;
	defaultSize?: number;
	direction?: 'horizontal' | 'vertical';
	autoSaveId?: string;
	withHandle?: boolean;
}>;

export function ResizablePanelGroup({
	children,
	className,
}: CommonProps): JSX.Element {
	return <div className={className}>{children}</div>;
}

export function ResizablePanel({
	children,
	className,
}: CommonProps): JSX.Element {
	return <div className={className}>{children}</div>;
}

export function ResizableHandle({ className }: CommonProps): JSX.Element {
	return <div className={className} />;
}
