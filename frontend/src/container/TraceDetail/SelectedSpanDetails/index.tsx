import { Space, Tabs, Typography } from 'antd';
import React from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

const { TabPane } = Tabs;
import {
	CardContainer,
	CustomSubText,
	CustomSubTitle,
	CustomText,
	CustomTitle,
} from './styles';
import ErrorTag from './ErrorTag';

const SelectedSpanDetails = (props: SelectedSpanDetailsProps): JSX.Element => {
	const { tree } = props;

	if (!tree) {
		return <></>;
	}

	const { name, tags, serviceName, hasError, event } = tree;

	console.log({ event });

	return (
		<CardContainer>
			<Space direction="vertical" style={{ marginLeft: '0.5rem' }}>
				<strong> Details for selected Span </strong>
				<Space direction="vertical" size={2}>
					<CustomTitle>Service</CustomTitle>
					<CustomText>{serviceName}</CustomText>
				</Space>
				<Space direction="vertical" size={2}>
					<CustomTitle>Operation</CustomTitle>
					<CustomText>{name}</CustomText>
				</Space>
			</Space>
			<Tabs defaultActiveKey="1">
				<TabPane tab="Tags" key="1">
					{tags.length !== 0 ? (
						tags.map((tags) => {
							return (
								<React.Fragment>
									{tags.value && (
										<>
											<CustomSubTitle>{tags.key}</CustomSubTitle>
											<CustomSubText>
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
						<Typography>No errors data in selected span</Typography>
					)}
				</TabPane>
			</Tabs>
		</CardContainer>
	);
};

interface SelectedSpanDetailsProps {
	tree?: ITraceTree;
}

export default SelectedSpanDetails;
