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

const SelectedSpanDetails = (props: SelectedSpanDetailsProps): JSX.Element => {
	const { tree } = props;

	if (!tree) {
		return <></>;
	}

	const { name, tags, serviceName, hasError } = tree;

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
				<TabPane tab="Errors" key="2">
					{hasError && tree.error && tree.error.length !== 0 ? (
						tree.error.map((errorTag) => (
							<React.Fragment key={errorTag.key}>
								<CustomSubTitle>{errorTag.key}</CustomSubTitle>
								<CustomSubText>true</CustomSubText>
							</React.Fragment>
						))
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
