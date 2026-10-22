import { Color } from '@signozhq/design-tokens';
import { Check, Copy, Eye, EyeOff } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './ChannelJsonDialog.module.scss';

interface ChannelJsonToolbarProps {
	kindHasSecrets: boolean;
	showSecrets: boolean;
	onToggleSecrets: () => void;
	copied: boolean;
	onCopy: () => void;
}

function ChannelJsonToolbar({
	kindHasSecrets,
	showSecrets,
	onToggleSecrets,
	copied,
	onCopy,
}: ChannelJsonToolbarProps): JSX.Element {
	return (
		<div className={styles.toolbar}>
			{kindHasSecrets && (
				<Typography.Text color="muted" size="sm">
					{showSecrets ? 'Credentials are visible.' : 'Credentials are hidden.'}
				</Typography.Text>
			)}
			<span className={styles.spacer} />
			{kindHasSecrets && (
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					prefix={showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
					onClick={onToggleSecrets}
					testId="channel-json-toggle-secrets"
				>
					{showSecrets ? 'Hide credentials' : 'Show credentials'}
				</Button>
			)}
			<Button
				variant="outlined"
				color="secondary"
				size="sm"
				prefix={
					copied ? (
						<Check size={14} color={Color.BG_FOREST_400} />
					) : (
						<Copy size={14} />
					)
				}
				onClick={onCopy}
				testId="channel-json-copy"
			>
				{copied ? 'Copied' : 'Copy'}
			</Button>
		</div>
	);
}

export default ChannelJsonToolbar;
