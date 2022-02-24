import { Space, Tabs } from 'antd';
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
	const spanTags = props.data?.tags;
	const service = props.data?.name?.split(':')[0];
	const operation = props.data?.name?.split(':')[1];

	return (
		<CardContainer>
			<Space direction="vertical">
				<strong> Details for selected Span </strong>
				<Space direction="vertical" size={2}>
					<CustomTitle style={{ marginTop: '18px' }}>Service</CustomTitle>
					<CustomText>{service}</CustomText>
				</Space>
				<Space direction="vertical" size={2}>
					<CustomTitle>Operation</CustomTitle>
					<CustomText>{operation}</CustomText>
				</Space>
			</Space>
			<Tabs defaultActiveKey="1">
				<TabPane tab="Tags" key="1">
					{spanTags &&
						spanTags.map((tags) => {
							return (
								<>
									{tags.value && (
										<>
											<CustomSubTitle>{tags.key}</CustomSubTitle>
											<CustomSubText>
												{tags.key === 'error' ? 'true' : tags.value}
											</CustomSubText>
										</>
									)}
								</>
							);
						})}
				</TabPane>
				<TabPane tab="Errors" key="2">
					{spanTags &&
						spanTags
							.filter((tags) => tags.key === 'error')
							.map((error) => (
								<>
									<CustomSubTitle key={error.key}>{error.key}</CustomSubTitle>
									<CustomSubText>true</CustomSubText>
								</>
							))}
				</TabPane>
			</Tabs>
		</CardContainer>
	);
};

interface SelectedSpanDetailsProps {
	data?: ITraceTree;
}

export default SelectedSpanDetails;
