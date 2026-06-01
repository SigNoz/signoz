import { useMemo } from 'react';
import { Tooltip } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { EllipsisVertical } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

interface Props {
	panel: DashboardtypesPanelDTO | undefined;
	panelId: string;
}

function PanelV2({ panel, panelId }: Props): JSX.Element {
	const name = panel?.spec?.display?.name || `Panel ${panelId.slice(0, 6)}`;
	const description = panel?.spec?.display?.description;
	const kind = panel?.spec?.plugin?.kind?.replace(/^signoz\//, '') ?? 'unknown';
	const queryCount = panel?.spec?.queries?.length ?? 0;

	const headerTitle = useMemo(() => {
		if (!description) {return name;}
		return (
			<Tooltip title={description}>
				<span>{name}</span>
			</Tooltip>
		);
	}, [name, description]);

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				width: '100%',
				background: 'var(--bg-ink-400, #0b0c0e)',
				border: '1px solid var(--bg-slate-400, #1d212d)',
				borderRadius: 4,
				overflow: 'hidden',
			}}
		>
			<div
				className="drag-handle"
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '8px 12px',
					borderBottom: '1px solid var(--bg-slate-400, #1d212d)',
					cursor: 'grab',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						minWidth: 0,
					}}
				>
					<Typography.Text
						style={{
							margin: 0,
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{headerTitle}
					</Typography.Text>
					<Badge style={{ marginInlineEnd: 0 }}>{kind}</Badge>
				</div>
				<EllipsisVertical size={14} />
			</div>

			<div
				style={{
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 12,
					color: 'var(--bg-vanilla-400, #8993ae)',
					fontSize: 12,
					textAlign: 'center',
				}}
			>
				<div>
					<div style={{ marginBottom: 6 }}>{kind} panel</div>
					<div>
						{queryCount} {queryCount === 1 ? 'query' : 'queries'} · chart rendering coming next
					</div>
				</div>
			</div>
		</div>
	);
}

export default PanelV2;
