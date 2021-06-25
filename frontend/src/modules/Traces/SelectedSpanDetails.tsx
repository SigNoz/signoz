import React from "react";
import { Card, Space, Tabs, Typography } from "antd";
import styled from "styled-components";
import { pushDStree } from "../../store/actions";

const { TabPane } = Tabs;

const { Text } = Typography;

interface SelectedSpanDetailsProps {
	data: pushDStree
}

const Title = styled(Text)`
 color: "#2D9CDB", 
 fontSize: '12px',
`;

const SelectedSpanDetails = (props: SelectedSpanDetailsProps) => {

	let spanTags = props.data.tags;
	let service = props.data?.name?.split(":")[0];
	let operation = props.data?.name?.split(":")[1];

	return (
		<Card style={{ border: "none", background: "transparent", padding: 0 }} bodyStyle={{ padding: 0 }}>
			<Space direction="vertical">

				<strong> Details for selected Span </strong>
				<Space direction="vertical" size={2}>
					<Text style={{ marginTop: "18px" }}>
						Service
					</Text>
					<Title style={{ color: "#2D9CDB", fontSize: "12px" }}>
						{service}
					</Title>
				</Space>
				<Space direction="vertical" size={2}>
					<Text>
						Operation
					</Text>
					<Text style={{ color: "#2D9CDB", fontSize: "12px" }}>
						{operation}
					</Text>
				</Space>
			</Space>
			<Tabs defaultActiveKey="1">
				<TabPane tab="Tags" key="1">
					{spanTags && spanTags.map((tags, index) => {
						return (
							<>
								{tags.value && (
									<>
										<Text style={{ color: "#BDBDBD", fontSize: "12px", marginBottom: "8px" }}>
											{tags.key}
										</Text>
										<div style={{
											background: "#4F4F4F",
											color: "#2D9CDB",
											fontSize: "12px",
											padding: "6px 8px",
											wordBreak: "break-all",
											marginBottom: "16px",
										}}>
											{tags.key === "error" ? "true" : tags.value}
										</div>
									</>
								)}
							</>
						);
					})}
				</TabPane>
				<TabPane tab="Errors" key="2">
					{spanTags && spanTags
						.filter((tags) => tags.key === "error")
						.map((error) => (
							<>
								<Text style={{ color: "#BDBDBD", fontSize: "12px", marginBottom: "8px" }}>
									{error.key}
								</Text>
								<div style={{
									background: "#4F4F4F",
									color: "#2D9CDB",
									fontSize: "12px",
									padding: "6px 8px",
									wordBreak: "break-all",
									marginBottom: "16px",
								}}>
									true
								</div>
							</>
						))}
				</TabPane>
			</Tabs>
		</Card>
	);
};

export default SelectedSpanDetails;
