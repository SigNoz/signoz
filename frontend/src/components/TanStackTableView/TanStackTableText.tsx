import type { ReactNode } from 'react';
import cx from 'classnames';

import tableStyles from './TanStackTable.module.scss';

export type TanStackTableTextProps = {
	children?: ReactNode;
	className?: string;
};

function TanStackTableText({
	children,
	className,
}: TanStackTableTextProps): JSX.Element {
	return (
		<span className={cx(tableStyles.tableCellText, className)}>{children}</span>
	);
}

export default TanStackTableText;
