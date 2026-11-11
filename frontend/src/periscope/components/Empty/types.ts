import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface EmptyProps extends HTMLAttributes<HTMLDivElement> {
	/** A string is an image URL. `Empty.PRESENTED_IMAGE_SIMPLE` switches to the compact variant. */
	image?: ReactNode;
	imageStyle?: CSSProperties;
	/** Defaults to "No data"; a falsy value hides it. */
	description?: ReactNode;
}

export interface SimpleImageColors {
	border: string;
	shadow: string;
	content: string;
}
