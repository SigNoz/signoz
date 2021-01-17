import React from "react";
import { Card, Tabs } from "antd";
const { TabPane } = Tabs;

interface spanTagItem {
	key: string;
	type: string;
	value: string;
}

interface SelectedSpanDetailsProps {
	clickedSpanTags: spanTagItem[];
}

const SelectedSpanDetails = (props: SelectedSpanDetailsProps) => {
	const callback = (key: any) => {};

	return (
		<Card style={{ height: 320 }}>
			<Tabs defaultActiveKey="1" onChange={callback}>
				<TabPane tab="Tags" key="1">
					<strong> Details for selected Span </strong>
					{props.clickedSpanTags.map((tags, index) => (
						<li
							key={index}
							style={{ color: "grey", fontSize: "13px", listStyle: "none" }}
						>
							<span className="mr-1">{tags.key}</span>:
							<span className="ml-1">
								{tags.key === "error" ? "true" : tags.value}
							</span>
						</li>
					))}{" "}
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
