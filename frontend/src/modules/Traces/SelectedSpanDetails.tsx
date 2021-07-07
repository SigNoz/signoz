import React from 'react';
import { Card, Space, Tabs, Typography } from 'antd';
import styled from 'styled-components';
import { pushDStree } from 'Src/store/actions';

const { TabPane } = Tabs;

const { Text, Title, Paragraph } = Typography;

interface SelectedSpanDetailsProps {
	data: pushDStree;
}

// Check this discussion for antd with styled components
// https://gist.github.com/newswim/fa916c66477ddd5952f7d6548e6a0605

const CustomTitle = styled(Title)`
	&&& {
		color: #f2f2f2;
		font-size: 14px;
	}
`;

const CustomText = styled(Text)`
	&&& {
		color: #2d9cdb;
		font-size: 14px;
	}
`;

const CustomSubTitle = styled(Title)`
	&&& {
		color: #bdbdbd;
		font-size: 14px;
		margin-bottom: 8px;
	}
`;

const CustomSubText = styled(Paragraph)`
	&&& {
		background: #4f4f4f;
		color: #2d9cdb;
		font-size: 12px;
		padding: 6px 8px;
		word-break: break-all;
		margin-bottom: 16px;
	}
`;

const SelectedSpanDetails = (props: SelectedSpanDetailsProps) => {
	const spanTags = props.data?.tags;
	const service = props.data?.name?.split(':')[0];
	const operation = props.data?.name?.split(':')[1];

	return (
		<Card
			style={{ border: 'none', background: 'transparent', padding: 0 }}
			bodyStyle={{ padding: 0 }}
		>
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
						spanTags.map((tags, index) => {
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
									<CustomSubTitle>{error.key}</CustomSubTitle>
									<CustomSubText>true</CustomSubText>
								</>
							))}
				</TabPane>
			</Tabs>
		</Card>
	);
};

export default SelectedSpanDetails;
