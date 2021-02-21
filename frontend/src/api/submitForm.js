import axios from "axios";
import { ENVIRONMENT } from "../constants/env";
import {Token} from "../utils/token";

export default axios.create({
	// baseURL: 'https://api.telegram.org/bot1518273960:AAHcgVvym9a0Qkl-PKiCI84X1VZaVbkTud0/',
	// baseURL: 'http://104.211.113.204:8080/api/v1/',
	// baseURL: "/api/v1/",
	baseURL: `${ENVIRONMENT.baseURL}/api/v1/`
});

//https://api.telegram.org/bot1518273960:AAHcgVvym9a0Qkl-PKiCI84X1VZaVbkTud0/sendMessage?chat_id=351813222&text=Hello%20there

// Chat ID can be obtained from here
//https://api.telegram.org/bot1518273960:AAHcgVvym9a0Qkl-PKiCI84X1VZaVbkTud0/getUpdates
