import { CircleHelp } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Popover } from '@signozhq/ui/popover';
import { Typography } from '@signozhq/ui/typography';

import { MARKDOWN_HELP_ITEMS } from './constants';

import styles from './MarkdownEditor.module.scss';

function MarkdownHelp(): JSX.Element {
	return (
		<Popover
			nativeButton
			side="bottom"
			align="end"
			width={280}
			maxHeight={320}
			aria-label="Markdown syntax"
			trigger={
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label="Markdown syntax help"
					testId="markdown-help-trigger"
				>
					<CircleHelp size={14} />
				</Button>
			}
		>
			<div className={styles.helpContent}>
				<Typography.Text className={styles.helpTitle}>
					Markdown syntax
				</Typography.Text>
				<dl className={styles.helpList}>
					{MARKDOWN_HELP_ITEMS.map((item) => (
						<div key={item.syntax} className={styles.helpRow}>
							<dt>
								<code>{item.syntax}</code>
							</dt>
							<dd>{item.label}</dd>
						</div>
					))}
				</dl>
			</div>
		</Popover>
	);
}

export default MarkdownHelp;
