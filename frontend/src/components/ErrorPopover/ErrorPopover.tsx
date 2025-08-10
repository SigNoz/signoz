/* eslint-disable react/jsx-props-no-spreading */
import { Popover, PopoverProps } from 'antd';
import { ReactNode } from 'react';

interface ErrorPopoverProps extends Omit<PopoverProps, 'content'> {
	/** Content to display in the popover */
	content: ReactNode;
	/** Element that triggers the popover */
	children: ReactNode;
}

/**
 * ErrorPopover - A clean wrapper around Ant Design's Popover
 * that provides a simple interface for displaying content in a popover.
 *
 * @example
 * <ErrorPopover content={<ErrorContent error={error} />}>
 *   <CircleX />
 * </ErrorPopover>
 */
function ErrorPopover({
	content,
	children,
	...popoverProps
}: ErrorPopoverProps): JSX.Element {
	return (
		<Popover content={content} {...popoverProps}>
			{children}
		</Popover>
	);
}

export default ErrorPopover;
