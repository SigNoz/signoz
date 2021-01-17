import axios from "axios";
import { ENVIRONMENT } from "../constants/env";
//import { format } from 'path';

export default axios.create({
	// baseURL: 'http://104.211.113.204:8080/api/v1/' //comment this line and remove  this comment before pushing
	// baseURL: process.env.QUERY_SERVICE_URL,
	// console.log('in traces API', process.env.QUERY_SERVICE_URL)
	// baseURL: "/api/v1/",
	baseURL: `${ENVIRONMENT.baseURL}/api/v1/`,
});
