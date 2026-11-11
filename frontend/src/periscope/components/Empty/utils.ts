import type { ReactNode } from 'react';
import cx from 'classnames';

import { DEFAULT_DESCRIPTION } from './constants';
import styles from './Empty.module.scss';

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
