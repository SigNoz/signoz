// shared config (dev and prod)
const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = {
	mode: "production",
	devtool: "source-map",
	entry: resolve(__dirname, "./src/index.tsx"),
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
		new CompressionPlugin({
			exclude: /.map$/,
		}),
		new HtmlWebpackPlugin({ template: "src/index.html.ejs" }),
		new CopyPlugin({
			patterns: [{ from: resolve(__dirname, "public/"), to: "." }],
		}),
	],
	performance: {
		hints: false,
	},
};
