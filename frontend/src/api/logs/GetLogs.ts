import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/logs/getLogs';

const GetLogs = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const data = await axios.get(`/logs`, {
			params: props,
		});

		return {
			statusCode: 200,
			error: null,
			message: '',
			payload: [
				{
					timestamp: 1677243723164343800,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3lS',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:03.163616 [ \u001b[38;2;255;59;103m635102\u001b[0m ] {\u001b[38;2;0;188;214mc12430d9-44d9-4c3c-ae37-cdfaaf342d50\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.006487694 sec., 374401 rows/sec., 2.86 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243721300828700,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3lC',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:01.300641 [ \u001b[38;2;0;178;246m629257\u001b[0m ] {\u001b[38;2;255;0;255m629bdfa6-8a49-4f98-93b0-1f67b03ded0c\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 19844 rows, 14.11 MiB in 0.055503869 sec., 357524 rows/sec., 254.29 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243721283852800,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3ki',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:01.283623 [ \u001b[38;2;67;190;0m637994\u001b[0m ] {\u001b[38;2;248;28;255m0ee96d3d-841f-4a0e-9a8b-210fd332d336\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 77188 rows, 5.96 MiB in 0.028911258 sec., 2669825 rows/sec., 206.24 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243721253569500,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3kh',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:01.253353 [ \u001b[38;2;48;151;214m635103\u001b[0m ] {\u001b[38;2;214;57;255mf3d053d3-b62f-447d-bb83-9ed7b714ff4d\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 1 rows, 1.86 KiB in 0.003365345 sec., 297 rows/sec., 551.93 KiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243721252732000,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3kg',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:01.252495 [ \u001b[38;2;84;115;255m637606\u001b[0m ] {\u001b[38;2;210;90;104m41ead330-1226-4bbe-84d2-3a55774bd7ee\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 1 rows, 1.86 KiB in 0.001577162 sec., 634 rows/sec., 1.15 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243721241888300,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3kf',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:01.241659 [ \u001b[38;2;84;115;255m637606\u001b[0m ] {\u001b[38;2;112;123;190ma69bf982-1598-442b-a029-05f9600fb8e2\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 6 rows, 206.00 B in 0.003361678 sec., 1784 rows/sec., 59.84 KiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243721240520000,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3ke',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:01.240289 [ \u001b[38;2;48;151;214m635103\u001b[0m ] {\u001b[38;2;97;182;0m1e298c59-1f6e-4f73-8431-85b65e4e0b02\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 6 rows, 206.00 B in 0.006783635 sec., 884 rows/sec., 29.66 KiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243721239442000,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3kd',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:01.239236 [ \u001b[38;2;67;190;0m637994\u001b[0m ] {\u001b[38;2;255;86;0m211bb385-bcc9-41de-a118-245e76924249\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 1 rows, 1.86 KiB in 0.003147855 sec., 317 rows/sec., 590.06 KiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243721230819800,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3kc',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:02:01.230637 [ \u001b[38;2;0;178;246m629257\u001b[0m ] {\u001b[38;2;0;228;0m25f00b91-b559-4abc-afc2-450db41ce298\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 6 rows, 206.00 B in 0.002615676 sec., 2293 rows/sec., 76.91 KiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243719965156900,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3j9',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:59.964879 [ \u001b[38;2;45;175;99m619287\u001b[0m ] {\u001b[38;2;255;45;179m3c261ba3-85a5-4b60-80f6-7f9885cbb72f\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.003806278 sec., 638156 rows/sec., 4.87 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243719856638700,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3io',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:59.856456 [ \u001b[38;2;165;149;0m619285\u001b[0m ] {\u001b[38;2;59;128;255me79feed7-a571-4880-a873-cdeb700ecd23\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.003558781 sec., 682537 rows/sec., 5.21 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243718645078000,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3i3',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:58.644894 [ \u001b[38;2;165;149;0m619285\u001b[0m ] {\u001b[38;2;70;182;0m608fe948-8a77-4a0a-a87b-a9d134fa980e\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 305 rows, 7.79 KiB in 0.002413671 sec., 126363 rows/sec., 3.15 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243718159936500,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3i2',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:58.159636 [ \u001b[38;2;255;59;103m635102\u001b[0m ] {\u001b[38;2;255;65;58mc7e8dfb6-9f43-4aaf-86ec-96bb23431254\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.003216177 sec., 755244 rows/sec., 5.76 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243714966219000,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3gu',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:54.966050 [ \u001b[38;2;45;175;99m619287\u001b[0m ] {\u001b[38;2;41;137;255m36e1c920-5c12-4cd2-83db-50e7b602a745\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.004710843 sec., 515618 rows/sec., 3.93 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243714858156800,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3gJ',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:54.857972 [ \u001b[38;2;165;149;0m619285\u001b[0m ] {\u001b[38;2;0;196;172m87e4c813-9cee-4787-a440-a3e174b17e47\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.005062837 sec., 479770 rows/sec., 3.66 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243714400980200,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3g2',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:54.400639 [ \u001b[38;2;255;59;103m635102\u001b[0m ] {\u001b[38;2;255;90;0m84a2eec0-8b5d-42c0-8b1d-f0135c72383a\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 199 rows, 6.70 KiB in 0.004095789 sec., 48586 rows/sec., 1.60 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243714377636900,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3g1',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:54.377342 [ \u001b[38;2;255;68;5m602004\u001b[0m ] {\u001b[38;2;248;76;76m069b5c45-4f9e-452a-9a36-a5811590d2b2\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 4829 rows, 1.56 MiB in 0.055287012 sec., 87344 rows/sec., 28.29 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243714321211100,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3fy',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:54.321006 [ \u001b[38;2;255;68;5m602004\u001b[0m ] {\u001b[38;2;0;180;246m7c4e37b5-29ee-4ee9-9f64-57e096656b14\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 439 rows, 508.66 KiB in 0.022198257 sec., 19776 rows/sec., 22.38 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243714200007400,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3ft',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:54.199829 [ \u001b[38;2;255;38;131m617644\u001b[0m ] {\u001b[38;2;255;72;0maeb60597-3589-45a8-a1ce-3536d102baaf\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2005 rows, 301.52 KiB in 0.018828294 sec., 106488 rows/sec., 15.64 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243713162686200,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3fE',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:53.162468 [ \u001b[38;2;255;59;103m635102\u001b[0m ] {\u001b[38;2;199;123;0m645bd4e2-93ba-472e-a04e-d37256e9a029\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.005403911 sec., 449489 rows/sec., 3.43 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243709965612500,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3cR',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:49.965405 [ \u001b[38;2;45;175;99m619287\u001b[0m ] {\u001b[38;2;105;141;119m62b1e3f4-45b0-40a9-8212-e2a0baf44227\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.004921701 sec., 493528 rows/sec., 3.77 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243709857515000,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3cC',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:49.857221 [ \u001b[38;2;165;149;0m619285\u001b[0m ] {\u001b[38;2;0;203;128mbcaf14e3-0283-4c31-b6ac-49e8cd00ff3e\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.00442863 sec., 548476 rows/sec., 4.18 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243708160438000,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3cB',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:48.159856 [ \u001b[38;2;255;59;103m635102\u001b[0m ] {\u001b[38;2;56;149;202m0e45cea4-ee6a-4cb2-ad44-74d78d10caaa\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.002687222 sec., 903907 rows/sec., 6.90 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243704964451600,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3ZP',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:44.964252 [ \u001b[38;2;45;175;99m619287\u001b[0m ] {\u001b[38;2;106;147;81mc944d9e3-f9ea-4124-9c9a-483f110d5e56\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.003623742 sec., 670301 rows/sec., 5.11 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
				{
					timestamp: 1677243704858374700,
					id: '2LeBMpod8nh7HRL2c9TQM3QA3ZO',
					trace_id: '',
					span_id: '',
					trace_flags: 0,
					severity_text: '',
					severity_number: 0,
					body:
						'2023.02.24 13:01:44.858193 [ \u001b[38;2;165;149;0m619285\u001b[0m ] {\u001b[38;2;251;80;46m56833003-ec1d-48a3-a3b4-b60a912cc2b0\u001b[0m} <\u001b[1mInformation\u001b[0m> \u001b[38;2;57;146;214mexecuteQuery\u001b[0m: Read 2429 rows, 18.98 KiB in 0.005168387 sec., 469972 rows/sec., 3.59 MiB/sec.\r\n',
					resources_string: {},
					attributes_string: {
						container_id:
							'3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13',
						log_file_path:
							'/var/lib/docker/containers/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13/3fff2cbafbee2122fbb5fa955b8ed9294d5ebd5834d2f97efc6487e3d22cfd13-json.log',
						stream: 'stdout',
					},
					attributes_int: {},
					attributes_float: {},
				},
			],
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default GetLogs;
