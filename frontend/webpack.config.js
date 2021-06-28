// shared config (dev and prod)
const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const portFinderSync = require('portfinder-sync')

console.log(resolve(__dirname, "./src/"));

module.exports = {
	mode: "development",
	devtool: "source-map",
	entry: resolve(__dirname, "./src/index.tsx"),
	devServer: {
		historyApiFallback: true,
		publicPath: "/",
		transportMode: "ws",
		open: true,
		openPage: "application",
		contentBase: [resolve(__dirname, "./public")],
		hot: true,
		liveReload: false,
		inline: true,
		// This is being used because if the port 3000 is being used
		// then it will try to find another open port availble.
		port: portFinderSync.getPort(3000),
	},
	output: {
		filename: "js/bundle.[chunkhash].min.js",
		path: resolve(__dirname, "./build"),
		publicPath: "/",
	},
	resolve: {
		alias: {
			Src: resolve(__dirname, "./src/"),
		},
		extensions: [".ts", ".tsx", ".js", ".jsx"],
	},
	module: {
		rules: [
			{
				test: [/\.jsx?$/, /\.tsx?$/],
				use: ["babel-loader"],
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
			{
				test: /\.(scss|sass)$/,
				use: ["style-loader", "css-loader", "sass-loader"],
			},
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				use: [
					"file-loader?hash=sha512&digest=hex&name=img/[chunkhash].[ext]",
					"image-webpack-loader?bypassOnDebug&optipng.optimizationLevel=7&gifsicle.interlaced=false",
				],
			},
		],
	},
	plugins: [
		new HtmlWebpackPlugin({ template: "src/index.html.ejs" }),
	],
	performance: {
		hints: false,
	},
};
