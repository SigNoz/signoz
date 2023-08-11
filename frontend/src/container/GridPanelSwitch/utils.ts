import React, { ReactNode } from 'react';

export const generateGridTitle = (title: ReactNode): string => {
	let graphTitle = '';
	if (React.isValidElement(title)) {
		if (Array.isArray(title.props.children)) {
			graphTitle = title.props.children
				.map((child: ReactNode) => {
					if (typeof child === 'string') {
						return child;
					}
					return '';
				})
				.join(' ');
		} else {
			graphTitle = title.props.children;
		}
	} else {
		graphTitle = title?.toString() || '';
	}
	return graphTitle;
};
