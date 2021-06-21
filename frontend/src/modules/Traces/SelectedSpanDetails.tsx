import React from "react";
import { Card, Space, Tabs, Typography } from "antd";
import styled from "styled-components";

const { TabPane } = Tabs;

const { Text } = Typography;

interface spanTagItem {
	key: string;
	type: string;
	value: string;
}

interface SelectedSpanDetailsProps {
	clickedSpanTags: spanTagItem[];
}

const Title = styled(Text)`
 color: "#2D9CDB", 
 fontSize: '12px',
`;

const SelectedSpanDetails = (props: SelectedSpanDetailsProps) => {
	const callback = (key: any) => {
	};

	return (
		<Card style={{ border: 'none', background: 'transparent', padding:0 }} bodyStyle={{padding: 0}}>
			<Space direction="vertical">

				<strong> Details for selected Span </strong>
				<Space direction="vertical" size={2}>
					<Text style={{ marginTop: "18px" }}>
						Service
					</Text>
					<Title style={{ color: "#2D9CDB", fontSize: '12px' }}>
						frontend
					</Title>
				</Space>
				<Space direction="vertical" size={2}>
					<Text>
						Operation
					</Text>
					<Text style={{ color: "#2D9CDB", fontSize: '12px' }}>
						POST /pay/:id
					</Text>
				</Space>
			</Space>
			<Tabs defaultActiveKey="1" onChange={callback}>
				<TabPane tab="Tags" key="1">
					{props.clickedSpanTags.map((tags, index) => (
						<>
						<Text style={{ color: "#BDBDBD", fontSize: "12px", marginBottom: "8px"}}>
							{tags.key}
						</Text >
						<div style={{
							background: '#4F4F4F',
							color: '#2D9CDB',
							fontSize: '12px',
							padding: '6px 8px',
							wordBreak: 'break-all',
							marginBottom: "16px"
						}}>
						{tags.key === "error" ? "true" : tags.value}
						</div>
						</>
					))}
				</TabPane>
				<TabPane tab="Errors" key="2">
					{props.clickedSpanTags
						.filter((tags) => tags.key === "error")
						.map((error) => (
							<div className="ml-5">
								<p style={{ color: "grey", fontSize: "10px" }}>
									<span className="mr-1">{error.key}</span>:
									<span className="ml-1">true</span>
								</p>
							</div>
						))}
				</TabPane>
			</Tabs>
		</Card>
	);
};

export default SelectedSpanDetails;
