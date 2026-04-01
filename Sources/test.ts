import * as Haiku from ".";
import fs from "node:fs";

(async () => {
	const testdataDir = `${__dirname}/Resources/Testdata`;
	for (const filename of fs.readdirSync(testdataDir)) {
		const path = `${testdataDir}/${filename}`;
		const content = fs.readFileSync(path, "utf-8");

		console.log(`Analyzing '${filename}' ...`);
		const haikus = await Haiku.find(content, {
			rule: [5, 7, 5],
			kagome: {
				sysdict: "uni"
			}
		});
		haikus.forEach((haiku) => {
			console.log(`  -> ${haiku}`);
		});
	}
})();