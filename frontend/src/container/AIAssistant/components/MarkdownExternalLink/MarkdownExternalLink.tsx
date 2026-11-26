import type { ComponentProps } from 'react';
import { Typography } from '@signozhq/ui/typography';

type MarkdownExternalLinkProps = ComponentProps<'a'> & {
	// react-markdown passes `node` — accept and ignore it
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	node?: any;
};

export default function MarkdownExternalLink({
	href,
	children,
}: MarkdownExternalLinkProps): JSX.Element {
	return (
		<Typography.Link
			variant="paragraph"
			size="base"
			weight="regular"
			textOverflow="wrap"
			href={href}
			target="_blank"
			testId="ai-markdown-link"
		>
			{children}
		</Typography.Link>
	);
}
