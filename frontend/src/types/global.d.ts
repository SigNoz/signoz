// For CSS
declare module '*.module.css' {
	const classes: { [key: string]: string };
	export default classes;
}

// For LESS
declare module '*.module.less' {
	const classes: { [key: string]: string };
	export default classes;
}

// For SCSS
declare module '*.module.scss' {
	const classes: { [key: string]: string };
	export default classes;
}

declare interface WindowEventMap {
	AFTER_LOGIN: CustomEvent;
	LOGOUT: CustomEvent;
}
