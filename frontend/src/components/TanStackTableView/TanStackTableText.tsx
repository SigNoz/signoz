import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
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

const TanStackTableText = forwardRef<HTMLSpanElement, TanStackTableTextProps>(
	({ children, className, dangerouslySetInnerHTML, ...rest }, ref) => (
		<span
			ref={ref}
			className={cx(tableStyles.tableCellText, className)}
			dangerouslySetInnerHTML={dangerouslySetInnerHTML}
			{...rest}
		>
			{children}
		</span>
	),
);

TanStackTableText.displayName = 'TanStackTableText';

export default TanStackTableText;
