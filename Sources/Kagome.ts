import { spawn } from "node:child_process";

// from https://github.com/ikawaha/kagome/tree/v2/tokenizer/token.go#L273-L284
export interface Token {
	id: number;
	start: number;
	end: number;
	surface: string;
	class: string;
	pos: string[];
	base_form: string;
	reading: string;
	pronunciation: string;
	features: string[];
}

export interface Options {
	path: string;
	sysdict: "ipa" | "uni";
	userDict?: string;
}

const defaultOptions: Options = {
	path: "kagome",
	sysdict: "ipa"
};

export function tokenize(text: string, options: Partial<Options> = {}): Promise<Token[]> {
	const _options = { ...defaultOptions, ...options };

	const args = ["-json"];
	if (_options.sysdict) {
		args.push("-sysdict", _options.sysdict);
	}
	if (_options.userDict) {
		args.push("-userdict", _options.userDict);
	}

	return new Promise<Token[]>((resolve, reject) => {
		const proc = spawn(_options.path, args);

		let stdout: string = "";
		let stderr: string = "";

		proc.stdout.on("data", (data: Buffer) => {
			stdout += data.toString();
		});

		proc.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(stderr));
				return;
			}

			try {
				const chunks = stdout.trim().split(/\n(?=\[)/g);
				const tokens = chunks.flatMap((chunk) =>
					JSON.parse(chunk)
				) as Token[];
				resolve(tokens);
			} catch (e) {
				reject(e);
			}
		});

		proc.stdin.write(text);
		proc.stdin.end();
	});
}