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

// Systems whose spans may rely on framework-specific attributes rather than messaging.system.
const IMPLICIT_MESSAGING_SYSTEMS = new Set<string>(['celery', 'undefined', '']);

// resolveDestinationTagKey selects the OpenTelemetry destination attribute key
// matching the active queue provider conventions.
export function resolveDestinationTagKey(details: RowData): string {
	const system = String(details.messaging_system ?? '')
		.trim()
		.toLowerCase();
	if (system === 'celery') {
		return 'messaging.destination';
	}
	return 'messaging.destination.name';
}

// buildFilterForDetailEntry converts a single row field from the overview table
// into a trace query builder TagFilterItem when the field carries a non-empty value.
function buildFilterForDetailEntry(
	details: RowData,
	entry: [string, string | number],
): TagFilterItem | undefined {
	const [key, value] = entry;
	const textValue = String(value ?? '').trim();
	if (!textValue) {
		return undefined;
	}

	switch (key) {
		case 'service_name':
			return getFiltersFromKeyValue('service.name', textValue, 'resource');
		case 'span_name':
			return getFiltersFromKeyValue('name', textValue, '');
		case 'messaging_system':
			return IMPLICIT_MESSAGING_SYSTEMS.has(textValue.toLowerCase())
				? undefined
				: getFiltersFromKeyValue('messaging.system', textValue, 'tag');
		case 'destination':
			return getFiltersFromKeyValue(
				resolveDestinationTagKey(details),
				textValue,
				'tag',
			);
		case 'kind_string':
			return getFiltersFromKeyValue('kind_string', textValue, '');
		default:
			return undefined;
	}
}

// buildOverviewDetailFilters constructs the query builder tag filters used by the
// right-hand detail drawer across Kafka, Celery, AWS SQS, Google Pub/Sub, Kinesis, and Redis.
export function buildOverviewDetailFilters(details: RowData): TagFilterItem[] {
	return Object.entries(details)
		.map((entry) => buildFilterForDetailEntry(details, entry))
		.filter((item): item is TagFilterItem => item !== undefined);
}

export default function CeleryOverviewDetails({
	details,
	onClose,
}: {
	details: RowData;
	onClose: () => void;
}): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const filters: TagFilterItem[] = useMemo(
		() => buildOverviewDetailFilters(details),
		[details],
	);

	return (
		<Drawer
			data-testid="mq-overview-details-drawer"
			width="60%"
			title={
				<div>
					<Typography.Text className="title">{details.service_name}</Typography.Text>
					<div>
						<Typography.Text className="subtitle">
							{details.span_name}
						</Typography.Text>
						<Divider type="vertical" />
						<Typography.Text className="subtitle">
							{details.messaging_system}
						</Typography.Text>
						<Divider type="vertical" />
						<Typography.Text className="subtitle">
							{details.destination}
						</Typography.Text>
						<Divider type="vertical" />
						<Typography.Text className="subtitle">
							{details.kind_string}
						</Typography.Text>
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
