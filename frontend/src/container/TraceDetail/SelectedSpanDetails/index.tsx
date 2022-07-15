import { Modal, Tabs, Tooltip, Typography } from 'antd';
import Editor from 'components/Editor';
import { StyledSpace } from 'components/Styled';
import useThemeMode from 'hooks/useThemeMode';
import React, { useMemo, useState } from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import EllipsedButton from './EllipsedButton';
import ErrorTag from './ErrorTag';
import {
	CardContainer,
	CustomSubText,
	CustomSubTitle,
	CustomText,
	CustomTitle,
	styles,
	SubTextContainer,
} from './styles';

const { TabPane } = Tabs;

function SelectedSpanDetails(props: SelectedSpanDetailsProps): JSX.Element {
	const { tree } = props;

	const { isDarkMode } = useThemeMode();

	const OverLayComponentName = useMemo(() => tree?.name, [tree?.name]);
	const OverLayComponentServiceName = useMemo(() => tree?.serviceName, [
		tree?.serviceName,
	]);

	const [isOpen, setIsOpen] = useState(false);

	const [text, setText] = useState({
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
					{tags.length !== 0 ? (
						tags.map((tags) => {
							const value = tags.key === 'error' ? 'true' : tags.value;
							const isEllipsed = value.length > 24;

							return (
								<React.Fragment key={JSON.stringify(tags)}>
									{tags.value && (
										<>
											<CustomSubTitle>{tags.key}</CustomSubTitle>
											<SubTextContainer isDarkMode={isDarkMode}>
												<Tooltip overlay={(): string => value}>
													<CustomSubText
														ellipsis={{
															rows: isEllipsed ? 1 : 0,
														}}
														isDarkMode={isDarkMode}
													>
														{value}
													</CustomSubText>

													{isEllipsed && (
														<EllipsedButton
															{...{
																event: tags.key,
																onToggleHandler,
																setText,
																value,
																buttonText: 'View full value',
															}}
														/>
													)}
												</Tooltip>
											</SubTextContainer>
										</>
									)}
								</React.Fragment>
							);
						})
					) : (
						<Typography>No tags in selected span</Typography>
					)}
				</TabPane>
				<TabPane tab="Events" key="2">
					{tree.event && Object.keys(tree.event).length !== 0 ? (
						<ErrorTag
							onToggleHandler={onToggleHandler}
							setText={setText}
							event={tree.event}
						/>
					) : (
						<Typography>No events data in selected span</Typography>
					)}
				</TabPane>
			</Tabs>
		</CardContainer>
	);
}

interface SelectedSpanDetailsProps {
	tree?: ITraceTree;
}

SelectedSpanDetails.defaultProps = {
	tree: undefined,
};

export default SelectedSpanDetails;
