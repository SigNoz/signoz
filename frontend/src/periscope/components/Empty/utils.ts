import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import { Empty as AntdEmpty } from 'antd';
import cx from 'classnames';

import { DEFAULT_DESCRIPTION } from './constants';
import styles from './Empty.module.scss';
import SimpleEmptyImage from './SimpleEmptyImage';

/** Also accepts antd's `Empty.PRESENTED_IMAGE_SIMPLE`, so call sites can migrate one import at a time. */
export function isSimpleImage(image: ReactNode): boolean {
	return (
		image === AntdEmpty.PRESENTED_IMAGE_SIMPLE ||
		(isValidElement(image) && image.type === SimpleEmptyImage)
	);
}

export function getEmptyClassName(
	className: string | undefined,
	isSimple: boolean,
): string {
	return cx(styles.empty, isSimple && styles.normal, className);
}

export function resolveDescription(description: ReactNode): ReactNode {
	return typeof description !== 'undefined' ? description : DEFAULT_DESCRIPTION;
}

export function getImageAlt(description: ReactNode): string {
	return typeof description === 'string' ? description : 'empty';
}
