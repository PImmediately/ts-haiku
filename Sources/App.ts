import * as dotenv from "dotenv";
dotenv.config();

import getSourcePath from "./TypeScript/Path";

(() => {
	console.log("Hello world!");
	console.log("");
	console.log("process.env.NODE_ENV :", process.env.NODE_ENV);
	console.log("");
	console.log("__dirname :", __dirname);
	console.log("getSourcePath(__dirname) :", getSourcePath(__dirname));
})();