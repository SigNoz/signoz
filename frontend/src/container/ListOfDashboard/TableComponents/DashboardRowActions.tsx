import { useMemo } from 'react';
import {
	EllipsisVertical,
	Expand,
	FileJson,
	Link2,
	SquareArrowOutUpRight,
	Trash2,
} from '@signozhq/icons';
import { Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import {
	downloadObjectAsJson,
	sanitizeDashboardData,
} from 'container/DashboardContainer/DashboardDescription/utils';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

import { Data } from '../DashboardsList';
import { useDeleteDashboardDialog } from './DeleteButton';

interface DashboardRowActionsProps {
	dashboard: Data;
	setCopy: (s: string) => void;
	safeNavigate: (link: string) => void;
}

export function DashboardRowActions({
	dashboard,
	setCopy,
	safeNavigate,
}: DashboardRowActionsProps): JSX.Element {
	const link = `${ROUTES.ALL_DASHBOARD}/${dashboard.id}`;

	const {
		openConfirmation,
		isDisabled: isDeleteDisabled,
		tooltipContent: deleteTooltipContent,
		contextHolder,
	} = useDeleteDashboardDialog({
		createdBy: dashboard.createdBy,
		name: dashboard.name,
		id: dashboard.id,
		isLocked: dashboard.isLocked,
	});

	const items: MenuItem[] = useMemo(
		() => [
			{
				key: 'view',
				icon: <Expand size={12} />,
				label: 'View',
				onClick: (): void => {
					safeNavigate(link);
					logEvent('Dashboard List: Clicked on dashboard', {
						dashboardId: dashboard.id,
						dashboardName: dashboard.name,
					});
				},
			},
			{
				key: 'open-new-tab',
				icon: <SquareArrowOutUpRight size={12} />,
				label: 'Open in New Tab',
				onClick: (): void => openInNewTab(link),
			},
			{
				key: 'copy-link',
				icon: <Link2 size={12} />,
				label: 'Copy Link',
				onClick: (): void => setCopy(getAbsoluteUrl(link)),
			},
			{
				key: 'export-json',
				icon: <FileJson size={12} />,
				label: 'Export JSON',
				onClick: (): void =>
					downloadObjectAsJson(
						sanitizeDashboardData({ ...dashboard, title: dashboard.name }),
						dashboard.name,
					),
			},
			{ type: 'divider', key: 'sep' },
			{
				key: 'delete',
				icon: <Trash2 size={12} />,
				label: deleteTooltipContent ? (
					<Tooltip placement="left" title={deleteTooltipContent}>
						<span>Delete Dashboard</span>
					</Tooltip>
				) : (
					<span>Delete Dashboard</span>
				),
				danger: true,
				disabled: isDeleteDisabled,
				onClick: openConfirmation,
			},
		],
		[
			dashboard,
			link,
			safeNavigate,
			setCopy,
			deleteTooltipContent,
			isDeleteDisabled,
			openConfirmation,
		],
	);

	return (
		<>
			<DropdownMenuSimple menu={{ items }} align="end">
				<Button
					variant="ghost"
					color="secondary"
					size="icon"
					className="dashboard-action-icon"
					data-testid="dashboard-action-icon"
					onClick={(e): void => {
						e.stopPropagation();
						e.preventDefault();
					}}
					prefix={<EllipsisVertical size={14} />}
				/>
			</DropdownMenuSimple>
			{contextHolder}
		</>
	);
}
