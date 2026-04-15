import type { ReactNode } from 'react';
import cx from 'classnames';

import tableStyles from './TanStackTable.module.scss';

export type TanStackTableTextProps = {
	children?: ReactNode;
	className?: string;
	dangerouslySetInnerHTML?: { __html: string };
};

function TanStackTableText({
	children,
	className,
	dangerouslySetInnerHTML,
}: TanStackTableTextProps): JSX.Element {
	return (
		<span
			className={cx(tableStyles.tableCellText, className)}
			dangerouslySetInnerHTML={dangerouslySetInnerHTML}
		>
			{children}
		</span>
	);
}

export default TanStackTableText;
