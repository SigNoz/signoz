import { CSSProperties, forwardRef } from 'react';
import { Typography } from '@signozhq/ui/typography';
import TanStackTable from 'components/TanStackTableView';

export interface TextNoDataProps {
	type: 'typography' | 'tanstack';
	className?: string;
	style?: CSSProperties;
}

export const TextNoData = forwardRef<HTMLSpanElement, TextNoDataProps>(
	function TextNoData({ type, className, style, ...props }, ref) {
		const combinedStyle = { opacity: 0.6, ...style };

		if (type === 'tanstack') {
			return (
				<TanStackTable.Text
					ref={ref}
					className={className}
					style={combinedStyle}
					{...props}
				>
					-
				</TanStackTable.Text>
			);
		}

		return (
			<span className={className} style={combinedStyle}>
				<Typography
					ref={ref}
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
					{...props}
				>
					-
				</Typography>
			</span>
		);
	},
);
