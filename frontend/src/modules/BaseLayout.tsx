import React, { ReactNode } from "react";

import { Layout } from "antd";
import SideNav from "./Nav/SideNav";
import TopNav from "./Nav/TopNav";
const { Content, Footer } = Layout;

interface BaseLayoutProps {
	children: ReactNode;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
	return (
		<Layout style={{ minHeight: "100vh" }}>
			<SideNav />
			<Layout className="site-layout">
				<Content style={{ margin: "0 16px" }}>
					<TopNav />
					{children}
				</Content>
				<Footer style={{ textAlign: "center", fontSize: 10 }}>
					SigNoz Inc. ©2020{" "}
				</Footer>
			</Layout>
		</Layout>
	);
};

export default BaseLayout;
