import type { HTMLAttributes, ReactNode } from 'react';
import cx from 'classnames';

import tableStyles from './TanStackTable.module.scss';

type BaseProps = Omit<
	HTMLAttributes<HTMLSpanElement>,
	'children' | 'dangerouslySetInnerHTML'
> & {
	className?: string;
};

type WithChildren = BaseProps & {
	children: ReactNode;
	dangerouslySetInnerHTML?: never;
};

type WithDangerousHtml = BaseProps & {
	children?: never;
	dangerouslySetInnerHTML: { __html: string };
};

export type TanStackTableTextProps = WithChildren | WithDangerousHtml;

function TanStackTableText({
	children,
	className,
	dangerouslySetInnerHTML,
	...rest
}: TanStackTableTextProps): JSX.Element {
	return (
		<span
			className={cx(tableStyles.tableCellText, className)}
			dangerouslySetInnerHTML={dangerouslySetInnerHTML}
			{...rest}
		>
			{children}
		</span>
	);
}

export default TanStackTableText;
