import { Button, Modal, Tabs, Typography } from 'antd';
import Editor from 'components/Editor';
import { StyledSpace } from 'components/Styled';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ITraceTree } from 'types/api/trace/getTraceItem';
import { GlobalReducer } from 'types/reducer/globalTime';

import { getTraceToLogsQuery } from './config';
import Events from './Events';
import { CardContainer, CustomSubText, styles } from './styles';
import Tags from './Tags';

function SelectedSpanDetails(props: SelectedSpanDetailsProps): JSX.Element {
	const { tree, firstSpanStartTime } = props;

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { id: traceId } = useParams<Params>();

	const isDarkMode = useIsDarkMode();

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
		const query = getTraceToLogsQuery(traceId, minTime, maxTime);

		history.push(
			`${ROUTES.LOGS_EXPLORER}?${createQueryParams({
				[QueryParams.compositeQuery]: JSON.stringify(query),
				[QueryParams.startTime]: minTime,
				[QueryParams.endTime]: maxTime,
			})}`,
		);
	};

	return (
		<CardContainer>
			<StyledSpace
				styledclass={[styles.selectedSpanDetailsContainer, styles.overflow]}
				direction="vertical"
			>
				<Typography.Text
					strong
					style={{
						marginTop: '16px',
					}}
				>
					{' '}
					Details for selected Span{' '}
				</Typography.Text>

				<Typography.Text style={{ fontWeight: 700 }}>Service</Typography.Text>

				<Typography>{tree.serviceName}</Typography>

				<Typography.Text style={{ fontWeight: 700 }}>Operation</Typography.Text>

				<Typography>{tree.name}</Typography>

				<Button size="small" style={{ marginTop: '8px' }} onClick={onLogsHandler}>
					Go to Related logs
				</Button>
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

			<Tabs style={{ padding: '8px' }} defaultActiveKey="1" items={items} />
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
