import { MouseEventHandler } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Compass, Copy, Ellipsis, Link } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { toast } from '@signozhq/ui/toast';
import { aggregateAttributesResourcesToString } from 'container/LogDetailedView/utils';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { ILog } from 'types/api/logs/log';

interface LogActionsProps {
	log: ILog;
	showOpenInExplorer?: boolean;
	onOpenInExplorer?: MouseEventHandler;
}

function LogActions({
	log,
	showOpenInExplorer = false,
	onOpenInExplorer,
}: LogActionsProps): JSX.Element {
	const [, copyToClipboard] = useCopyToClipboard();
	const { onLogCopy } = useCopyLogLink(log?.id);

	const handleCopyLog = (): void => {
		copyToClipboard(aggregateAttributesResourcesToString(log));
		toast.success('Copied to clipboard', { position: 'bottom-right' });
	};

	const menuItems: DropdownItemType[] = [
		{
			type: 'item',
			value: 'copy-log',
			label: 'Copy log',
			prefix: <Copy size={14} />,
			onClick: handleCopyLog,
		},
		{
			type: 'item',
			value: 'copy-link',
			label: 'Copy link to log',
			prefix: <Link size={14} />,
			onClick: (): void => onLogCopy(),
		},
	];

	return (
		<>
			{showOpenInExplorer && (
				<Button
					size="sm"
					variant="outlined"
					color="secondary"
					prefix={<Compass size={14} />}
					onClick={onOpenInExplorer}
					testId="log-details-header-open-in-explorer"
				>
					Open in Explorer
				</Button>
			)}

			<Dropdown items={menuItems} nativeButton align="end" side="bottom">
				<Button
					size="sm"
					variant="link"
					color="secondary"
					icon
					aria-label="Log actions"
					testId="log-details-header-menu"
				>
					<Ellipsis size={16} />
				</Button>
			</Dropdown>
		</>
	);
}

LogActions.defaultProps = {
	showOpenInExplorer: false,
	onOpenInExplorer: undefined,
};

export default LogActions;
