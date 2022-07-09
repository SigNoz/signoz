import { Tabs, Tooltip, Typography } from 'antd';
import { StyledSpace } from 'components/Styled';
import useThemeMode from 'hooks/useThemeMode';
import React, { useMemo } from 'react';
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

	const OverLayComponentName = useMemo(() => tree?.name, [tree?.name]);
	const OverLayComponentServiceName = useMemo(() => tree?.serviceName, [
		tree?.serviceName,
	]);

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

SelectedSpanDetails.defaultProps = {
	tree: undefined,
};

export default SelectedSpanDetails;
