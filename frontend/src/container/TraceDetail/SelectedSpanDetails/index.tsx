import { Modal, Tabs, Tooltip } from 'antd';
import Editor from 'components/Editor';
import { StyledSpace } from 'components/Styled';
import useThemeMode from 'hooks/useThemeMode';
import React, { useMemo, useState } from 'react';
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

const { TabPane } = Tabs;

function SelectedSpanDetails(props: SelectedSpanDetailsProps): JSX.Element {
	const { tree, firstSpanStartTime } = props;

	const { isDarkMode } = useThemeMode();

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

	const { tags } = tree;

	return (
		<CardContainer>
			<StyledSpace
				styledclass={[styles.selectedSpanDetailsContainer, styles.overflow]}
				direction="vertical"
				style={{ marginLeft: '0.5rem' }}
			>
				<strong> Details for selected Span </strong>

				<CustomTitle>Service</CustomTitle>
				<Tooltip overlay={OverLayComponentServiceName}>
					<CustomText ellipsis>{tree.serviceName}</CustomText>
				</Tooltip>

				<CustomTitle>Operation</CustomTitle>
				<Tooltip overlay={OverLayComponentName}>
					<CustomText ellipsis>{tree.name}</CustomText>
				</Tooltip>
			</StyledSpace>

			<Modal
				onCancel={(): void => onToggleHandler(false)}
				title={text.text}
				visible={isOpen}
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

			<Tabs defaultActiveKey="1">
				<TabPane tab="Tags" key="1">
					<Tags onToggleHandler={onToggleHandler} setText={setText} tags={tags} />
				</TabPane>
				<TabPane tab="Events" key="2">
					<Events
						events={tree.event}
						onToggleHandler={onToggleHandler}
						setText={setText}
						firstSpanStartTime={firstSpanStartTime}
					/>
				</TabPane>
			</Tabs>
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

export default SelectedSpanDetails;
