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
	const { data: { tags } } = props
	const spanTags = tags && Array.isArray(tags) && tags.length > 0 ? tags : null
	const service = props.data?.name?.split(':')[0];
	const operation = props.data?.name?.split(':')[1];
	const errorTags = spanTags && spanTags
		.filter((tags) => tags.key === 'isError').length > 0 ? spanTags
			.filter((tags) => tags.key === 'isError').length : null

	return (
		<CardContainer>
			<Space direction="vertical" style={{ marginLeft: '0.5rem' }}>
				<strong> Details for selected Span </strong>
				<Space direction="vertical" size={2}>
					<CustomTitle >Service</CustomTitle>
					<CustomText>{service}</CustomText>
				</Space>
				<Space direction="vertical" size={2}>
					<CustomTitle>Operation</CustomTitle>
					<CustomText>{operation}</CustomText>
				</Space>
			</Space>
			<Tabs defaultActiveKey="1">
				<TabPane tab="Tags" key="1">
					{spanTags ?
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
						}) : <Typography>No tags in selected span</Typography>}
				</TabPane>
				<TabPane tab="Errors" key="2">
					{errorTags ?
						errorTags.map((errorTag) => (
							<>
								<CustomSubTitle key={errorTag.key}>{errorTag.key}</CustomSubTitle>
								<CustomSubText>true</CustomSubText>
							</>
						)) :
						<Typography>No errors data in selected span</Typography>}
				</TabPane>
			</Tabs>
		</CardContainer>
	);
};

interface SelectedSpanDetailsProps {
	data?: ITraceTree;
}

export default SelectedSpanDetails;
