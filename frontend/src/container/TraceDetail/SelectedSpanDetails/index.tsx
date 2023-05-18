import { Button, Modal, Tabs, Tooltip, Typography } from 'antd';
import Editor from 'components/Editor';
import { StyledSpace } from 'components/Styled';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import history from 'lib/history';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import Events from './Events';
import {
	CardContainer,
	CustomSubText,
	CustomText,
	CustomTitle,
	styles,
} from './styles';
import Tags from './Tags';

function SelectedSpanDetails(props: SelectedSpanDetailsProps): JSX.Element {
	const { tree, firstSpanStartTime } = props;

	const { id: traceId } = useParams<Params>();

	const isDarkMode = useIsDarkMode();

	const OverLayComponentName = useMemo(() => tree?.name, [tree?.name]);
	const OverLayComponentServiceName = useMemo(() => tree?.serviceName, [
		tree?.serviceName,
	]);

	const [isOpen, setIsOpen] = useState(false);

	const [text, setText] = useState<ModalText>({
		text: '',
		subText: '',
	});

	const onToggleHandler = (state: boolean): void => {
		setIsOpen(state);
	};

	if (!tree) {
		return <div />;
	}

	const { tags, nonChildReferences } = tree;

	const items = [
		{
			label: 'Tags',
			key: '1',
			children: (
				<Tags
					onToggleHandler={onToggleHandler}
					setText={setText}
					tags={tags}
					linkedSpans={nonChildReferences}
				/>
			),
		},
		{
			label: 'Events',
			key: '2',
			children: (
				<Events
					events={tree.event}
					onToggleHandler={onToggleHandler}
					setText={setText}
					firstSpanStartTime={firstSpanStartTime}
				/>
			),
		},
	];

	const onLogsHandler = (): void => {
		const query = encodeURIComponent(`trace_id IN ('${traceId}')`);

		history.push(`${ROUTES.LOGS}?q=${query}`);
	};

	return (
		<CardContainer>
			<StyledSpace
				styledclass={[styles.selectedSpanDetailsContainer, styles.overflow]}
				direction="vertical"
			>
				<Typography.Text strong> Details for selected Span </Typography.Text>

				<CustomTitle>Service</CustomTitle>

				<Tooltip overlay={OverLayComponentServiceName}>
					<CustomText ellipsis>{tree.serviceName}</CustomText>
				</Tooltip>

				<CustomTitle>Operation</CustomTitle>
				<Tooltip overlay={OverLayComponentName}>
					<CustomText ellipsis>{tree.name}</CustomText>
				</Tooltip>

				<Button onClick={onLogsHandler}>Go to Related logs</Button>
			</StyledSpace>

			<Modal
				onCancel={(): void => onToggleHandler(false)}
				title={text.text}
				open={isOpen}
				destroyOnClose
				footer={[]}
				width="70vw"
				centered
			>
				{text.text === 'exception.stacktrace' ? (
					<Editor onChange={(): void => {}} readOnly value={text.subText} />
				) : (
					<CustomSubText ellipsis={false} isDarkMode={isDarkMode}>
						{text.subText}
					</CustomSubText>
				)}
			</Modal>

			<Tabs defaultActiveKey="1" items={items} />
		</CardContainer>
	);
}

interface SelectedSpanDetailsProps {
	tree?: ITraceTree;
	firstSpanStartTime: number;
}

SelectedSpanDetails.defaultProps = {
	tree: undefined,
};

export interface ModalText {
	text: string;
	subText: string;
}

interface Params {
	id: string;
}

export default SelectedSpanDetails;
