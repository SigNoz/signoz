import { Space, Tabs, Typography } from 'antd';
import { StyledSpace } from 'components/Styled';
import useThemeMode from 'hooks/useThemeMode';
import React from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import ErrorTag from './ErrorTag';
import {
	CardContainer,
	CustomSubText,
	CustomSubTitle,
	CustomText,
	CustomTitle,
	styles,
} from './styles';

const { TabPane } = Tabs;

function SelectedSpanDetails(props: SelectedSpanDetailsProps): JSX.Element {
	const { tree } = props;
	const { isDarkMode } = useThemeMode();
	if (!tree) {
		return <></>;
	}

	const { name, tags, serviceName } = tree;

	return (
		<CardContainer>
			<StyledSpace
				styledclass={[styles.selectedSpanDetailsContainer]}
				direction="vertical"
				style={{ marginLeft: '0.5rem' }}
			>
				<strong> Details for selected Span </strong>
				<Space direction="vertical" size={2}>
					<CustomTitle>Service</CustomTitle>
					<CustomText>{serviceName}</CustomText>
				</Space>
				<Space direction="vertical" size={2}>
					<CustomTitle>Operation</CustomTitle>
					<CustomText>{name}</CustomText>
				</Space>
			</StyledSpace>
			<Tabs defaultActiveKey="1">
				<TabPane tab="Tags" key="1">
					{tags.length !== 0 ? (
						tags.map((tags) => {
							return (
								<React.Fragment key={JSON.stringify(tags)}>
									{tags.value && (
										<>
											<CustomSubTitle>{tags.key}</CustomSubTitle>
											<CustomSubText isDarkMode={isDarkMode}>
												{tags.key === 'error' ? 'true' : tags.value}
											</CustomSubText>
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
						<ErrorTag event={tree.event} />
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

export default SelectedSpanDetails;
