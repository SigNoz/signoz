import React, { ReactNode, useEffect } from "react";

import { Layout } from "antd";
import SideNav from "./Nav/SideNav";
import TopNav from "./Nav/TopNav";
import { useLocation } from "react-router-dom";
import ROUTES from "Src/constants/routes";
import { useRoute } from "./RouteProvider";

const { Content, Footer } = Layout;

interface BaseLayoutProps {
	children: ReactNode;
}

interface RouteObj {
	[key: string]: {
		route: string;
		isLoaded: boolean;
	};
}
const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
	const location = useLocation();
	const { dispatch } = useRoute();

	/*
	Create a routes obj with values as
	{
		SERVICE_MAP: {
			route: '/service-map',
			isLoaded: false
	}
	 */
	const routes: RouteObj = {};
	Object.keys(ROUTES).map((items) => {
		routes[items] = {
			route: `${ROUTES[items]}`,
			isLoaded: false,
		};
	});

	useEffect(() => {
		/*
		Update the isLoaded property in routes obj
		if the route matches the current pathname
		 */
		Object.keys(ROUTES).map((items) => {
			routes[items].isLoaded = routes[items].route === location.pathname;
		});
		dispatch({ type: "UPDATE", payload: routes });
	}, [location]);

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
