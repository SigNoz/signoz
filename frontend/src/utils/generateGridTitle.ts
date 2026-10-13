import React, { ReactNode } from 'react';

export const generateGridTitle = (title: ReactNode): string => {
	if (React.isValidElement(title)) {
		return Array.isArray(title.props.children)
			? title.props.children
					.map((child: ReactNode) => (typeof child === 'string' ? child : ''))
					.join(' ')
			: title.props.children;
	}
	return title?.toString() || '';
};
