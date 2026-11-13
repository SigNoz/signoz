import { useMemo } from 'react';
import { Color, Spacing } from '@signozhq/design-tokens';
import { Drawer } from 'antd';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';
import { RowData } from 'components/CeleryOverview/CeleryOverviewTable/CeleryOverviewTable';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { X } from '@signozhq/icons';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { getFiltersFromKeyValue } from '../CeleryOverviewUtils';
import OverviewRightPanelGraph from './OverviewRightPanelGraph';
import ValueInfo from './ValueInfo';

import './CeleryOverviewDetails.styles.scss';

export default function CeleryOverviewDetails({
	details,
	onClose,
}: {
	details: RowData;
	onClose: () => void;
}): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const filters: TagFilterItem[] = useMemo(() => {
		const keyValues = Object.entries(details).map(([key, value]) => {
			switch (key) {
				case 'service_name':
					return getFiltersFromKeyValue('service.name', value, 'resource');
				case 'span_name':
					return getFiltersFromKeyValue('name', value, '');
				case 'messaging_system':
					return value === 'celery'
						? undefined
						: getFiltersFromKeyValue('messaging.system', value, 'tag');
				case 'destination':
					return getFiltersFromKeyValue(
						details.messaging_system === 'celery'
							? 'messaging.destination'
							: 'messaging.destination.name',
						value,
						'tag',
					);
				case 'kind_string':
					return getFiltersFromKeyValue('kind_string', value, '');
				default:
					return undefined;
			}
		});

		return keyValues.filter((item) => item !== undefined) as TagFilterItem[];
	}, [details]);

	return (
		<Drawer
			data-testid="mq-overview-details-drawer"
			width="60%"
			title={
				<div>
					<Typography
						variant="label"
						size="large"
						weight="bold"
						color="main"
						as="span"
						textOverflow="wrap"
					>
						{details.service_name}
					</Typography>
					<div>
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							{details.span_name}
						</Typography>
						<Divider orientation="vertical" />
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							{details.messaging_system}
						</Typography>
						<Divider orientation="vertical" />
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							{details.destination}
						</Typography>
						<Divider orientation="vertical" />
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							{details.kind_string}
						</Typography>
					</div>
				</div>
			}
			placement="right"
			onClose={onClose}
			open={!!details}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="celery-task-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			<div className="celery-overview-detail-container">
				<ValueInfo filters={filters} />
				<OverviewRightPanelGraph filters={filters} />
			</div>
		</Drawer>
	);
}
