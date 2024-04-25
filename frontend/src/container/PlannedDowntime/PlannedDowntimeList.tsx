import './PlannedDowntime.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Collapse, Flex, List, Tag, Typography } from 'antd';
import { CalendarClock, PenLine, Trash2 } from 'lucide-react';

const { Panel } = Collapse;

function HeaderComponent(): JSX.Element {
	return (
		<Flex className="header-content" justify="space-between">
			<Flex gap={8}>
				<Typography>test-downtime</Typography>
				<Tag>40 min</Tag>
			</Flex>

			<div className="action-btn">
				<PenLine
					size={14}
					// className={isEditDeleteSupported ? '' : 'hidden'}
					// onClick={(): void => handleEditModelOpen(view, bgColor)}
				/>
				<Trash2
					size={14}
					// className={isEditDeleteSupported ? '' : 'hidden'}
					color={Color.BG_CHERRY_500}
					// onClick={(): void => handleDeleteModelOpen(view.uuid, view.name)}
				/>
			</div>
		</Flex>
	);
}

function CustomCollapseList(): JSX.Element {
	const dataSource = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);

	const renderListItems = (start: number, end: number): JSX.Element[] =>
		dataSource
			.slice(start, end)
			.map((item): JSX.Element => <List.Item key={item}>{item}</List.Item>);

	const createdAt = '2024-01-18T10:39:33.43776243Z';

	const timeOptions: Intl.DateTimeFormatOptions = {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	};
	const formattedTime = new Date(createdAt).toLocaleTimeString(
		'en-US',
		timeOptions,
	);

	const dateOptions: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	};

	const formattedDate = new Date(createdAt).toLocaleDateString(
		'en-US',
		dateOptions,
	);

	// Combine time and date
	const formattedDateAndTime = `Coming up on ⎯ ${formattedDate} ${formattedTime}`;

	return (
		<>
			<Collapse accordion>
				<Panel header={<HeaderComponent />} key="1">
					<List size="small">
						{renderListItems(0, Math.ceil(dataSource.length / 2))}
					</List>
				</Panel>
			</Collapse>
			<div className="view-created-at">
				<CalendarClock size={14} />
				<Typography.Text>{formattedDateAndTime}</Typography.Text>
			</div>
		</>
	);
}

export default CustomCollapseList;
