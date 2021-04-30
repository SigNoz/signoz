import React, { useState } from "react";
import { Row, Col } from "antd";

import DateTimeSelector from "./DateTimeSelector";
import ShowBreadcrumbs from "./ShowBreadcrumbs";

const TopNav = () => {
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
