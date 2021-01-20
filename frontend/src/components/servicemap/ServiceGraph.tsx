import React from "react";
// import {useState} from "react";
import Graph from "react-graph-vis";
// import { graphEvents } from "react-graph-vis";

//PNOTE - types of react-graph-vis defined in typings folder.
//How is it imported directly?
// type definition for service graph - https://github.com/crubier/react-graph-vis/issues/80

// Set shapes - https://visjs.github.io/vis-network/docs/network/nodes.html#
// https://github.com/crubier/react-graph-vis/issues/93
const graph = {
	nodes: [
		{
			id: 1,
			label: "Catalogue",
			shape: "box",
			color: "green",
			border: "black",
			size: 100,
		},
		{ id: 2, label: "Users", shape: "box", color: "#FFFF00" },
		{ id: 3, label: "Payment App", shape: "box", color: "#FB7E81" },
		{ id: 4, label: "My Sql", shape: "box", size: 10, color: "#7BE141" },
		{ id: 5, label: "Redis-db", shape: "box", color: "#6E6EFD" },
	],
	edges: [
		{ from: 1, to: 2, color: { color: "red" }, size: { size: 20 } },
		{ from: 2, to: 3, color: { color: "red" } },
		{ from: 1, to: 3, color: { color: "red" } },
		{ from: 3, to: 4, color: { color: "red" } },
		{ from: 3, to: 5, color: { color: "red" } },
	],
};

const options = {
	layout: {
		hierarchical: true,
	},
	edges: {
		color: "#000000",
	},
	height: "500px",
};

// const events = {
//   select: function(event:any) {  //PNOTE - TO DO - Get rid of any type
//     var { nodes, edges } = event;
//   }
// };

const ServiceGraph = () => {
	// const [network, setNetwork] = useState(null);

	return (
		<React.Fragment>
			<div> Updated Service Graph module coming soon..</div>

			<Graph
				graph={graph}
				options={options}
				// events={events}
				// getNetwork={network => {
				//   //  if you want access to vis.js network api you can set the state in a parent component using this property
				// }}
			/>
		</React.Fragment>
	);
};

export default ServiceGraph;
