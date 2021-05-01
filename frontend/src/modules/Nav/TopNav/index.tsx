import React, { useState } from "react";
import { Row, Col } from "antd";
import { useHistory } from "react-router-dom";

import DateTimeSelector from "./DateTimeSelector";
import ShowBreadcrumbs from "./ShowBreadcrumbs";

const TopNav = () => {
	const history = useHistory();

	if (history.location.pathname === "/signup") {
		return null;
	}
	return (
		<Row>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			<Col span={8}>
				<DateTimeSelector />
			</Col>
		</Row>
	);
};

export default TopNav;
