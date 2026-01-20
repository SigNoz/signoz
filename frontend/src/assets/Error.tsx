import React from 'react';

type ErrorIconProps = React.SVGProps<SVGSVGElement>;

function ErrorIcon({ ...props }: ErrorIconProps): JSX.Element {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
		>
			<path
				fill="#C62828"
				d="M1.281 5.78a.922.922 0 0 0-.92.921v4.265a.922.922 0 0 0 .92.92h.617V5.775l-.617.005ZM12.747 5.78c.508 0 .92.413.92.92v4.264a.923.923 0 0 1-.92.922h-.617V5.775l.617.004Z"
			/>
			<path
				fill="#90A4AE"
				d="M12.463 5.931 12.45 4.82a.867.867 0 0 0-.87-.861H7.34v-1.49a1.083 1.083 0 1 0-.68 0v1.496H2.42a.867.867 0 0 0-.864.86v7.976c.003.475.389.86.865.862h9.16a.868.868 0 0 0 .869-.862v-.82h.013v-6.05Z"
			/>
			<path
				fill="#C62828"
				d="M7 1.885a.444.444 0 1 1 0-.888.444.444 0 0 1 0 .888Z"
			/>
			<path
				fill="url(#a)"
				d="M4.795 10.379h4.412c.384 0 .696.312.696.697v.063a.697.697 0 0 1-.696.697H4.795a.697.697 0 0 1-.697-.697v-.063c0-.385.312-.697.697-.697Z"
			/>
			<path fill="url(#b)" d="M6.115 10.38h-.262v1.455h.262V10.38Z" />
			<path fill="url(#c)" d="M7.138 10.38h-.262v1.455h.262V10.38Z" />
			<path fill="url(#d)" d="M8.147 10.38h-.262v1.455h.262V10.38Z" />
			<path fill="url(#e)" d="M9.22 10.38h-.262v1.455h.262V10.38Z" />
			<path fill="url(#f)" d="M5.042 10.379H4.78v1.454h.262V10.38Z" />
			<path
				fill="#C62828"
				d="M7 9.367h-.593a.111.111 0 0 1-.098-.162l.304-.6.288-.532a.11.11 0 0 1 .195 0l.29.556.301.576a.11.11 0 0 1-.098.162H7Z"
			/>
			<path
				fill="url(#g)"
				d="M4.627 8.587a1.278 1.278 0 1 0 0-2.556 1.278 1.278 0 0 0 0 2.556Z"
			/>
			<path
				fill="url(#h)"
				fillRule="evenodd"
				d="M4.627 6.142a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333ZM3.237 7.31a1.389 1.389 0 1 1 2.778 0 1.389 1.389 0 0 1-2.777 0Z"
				clipRule="evenodd"
			/>
			<path
				fill="url(#i)"
				d="M9.333 6.028a1.278 1.278 0 1 0 0 2.556 1.278 1.278 0 0 0 0-2.556Z"
			/>
			<path
				fill="url(#j)"
				fillRule="evenodd"
				d="M7.944 7.306a1.39 1.39 0 0 1 2.778 0 1.389 1.389 0 0 1-2.778 0Zm1.39-1.167a1.167 1.167 0 1 0 0 2.334 1.167 1.167 0 0 0 0-2.334Z"
				clipRule="evenodd"
			/>
			<defs>
				<linearGradient
					id="a"
					x1="7.001"
					x2="7.001"
					y1="11.836"
					y2="10.379"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset=".12" stopColor="#E0E0E0" />
					<stop offset=".52" stopColor="#fff" />
					<stop offset="1" stopColor="#EAEAEA" />
				</linearGradient>
				<linearGradient
					id="b"
					x1="5.984"
					x2="5.984"
					y1="11.835"
					y2="10.381"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#333" />
					<stop offset=".55" stopColor="#666" />
					<stop offset="1" stopColor="#333" />
				</linearGradient>
				<linearGradient
					id="c"
					x1="7.007"
					x2="7.007"
					y1="11.835"
					y2="10.381"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#333" />
					<stop offset=".55" stopColor="#666" />
					<stop offset="1" stopColor="#333" />
				</linearGradient>
				<linearGradient
					id="d"
					x1="8.016"
					x2="8.016"
					y1="11.835"
					y2="10.381"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#333" />
					<stop offset=".55" stopColor="#666" />
					<stop offset="1" stopColor="#333" />
				</linearGradient>
				<linearGradient
					id="e"
					x1="9.089"
					x2="9.089"
					y1="11.835"
					y2="10.381"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#333" />
					<stop offset=".55" stopColor="#666" />
					<stop offset="1" stopColor="#333" />
				</linearGradient>
				<linearGradient
					id="f"
					x1="4.911"
					x2="4.911"
					y1="11.833"
					y2="10.379"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#333" />
					<stop offset=".55" stopColor="#666" />
					<stop offset="1" stopColor="#333" />
				</linearGradient>
				<linearGradient
					id="h"
					x1="3.238"
					x2="6.015"
					y1="7.309"
					y2="7.309"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#333" />
					<stop offset=".55" stopColor="#666" />
					<stop offset="1" stopColor="#333" />
				</linearGradient>
				<linearGradient
					id="j"
					x1="7.939"
					x2="10.716"
					y1="7.306"
					y2="7.306"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#333" />
					<stop offset=".55" stopColor="#666" />
					<stop offset="1" stopColor="#333" />
				</linearGradient>
				<radialGradient
					id="g"
					cx="0"
					cy="0"
					r="1"
					gradientTransform="matrix(1.27771 0 0 1.2777 4.627 7.309)"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset=".48" stopColor="#fff" />
					<stop offset=".77" stopColor="#FDFDFD" />
					<stop offset=".88" stopColor="#F6F6F6" />
					<stop offset=".96" stopColor="#EBEBEB" />
					<stop offset="1" stopColor="#E0E0E0" />
				</radialGradient>
				<radialGradient
					id="i"
					cx="0"
					cy="0"
					r="1"
					gradientTransform="matrix(1.27771 0 0 1.2777 9.328 7.306)"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset=".48" stopColor="#fff" />
					<stop offset=".77" stopColor="#FDFDFD" />
					<stop offset=".88" stopColor="#F6F6F6" />
					<stop offset=".96" stopColor="#EBEBEB" />
					<stop offset="1" stopColor="#E0E0E0" />
				</radialGradient>
			</defs>
		</svg>
	);
}

export default ErrorIcon;
