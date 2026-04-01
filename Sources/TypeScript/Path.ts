import path from "node:path";
import fs from "node:fs";
import TypeScript from "typescript";

const currentDir = process.cwd();

const tsConfigFile = "tsconfig.json";
const tsConfigPath = path.join(currentDir, tsConfigFile);
if (!fs.existsSync(tsConfigPath)) throw new Error(`'${tsConfigFile}' not found in the current working directory.`);

const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, "utf-8")) as { compilerOptions?: TypeScript.CompilerOptions };
const outDir = tsConfig.compilerOptions?.outDir;
if (!outDir) throw new Error(`'tsConfig.compilerOptions.outDir' not found in '${tsConfigFile}'.`);

const distDir = path.join(currentDir, outDir);

export default function getSourcePath(base: string): string {
	if (!base.startsWith(distDir)) throw new Error("Path is not inside distribution directory");

	const relative = path.relative(distDir, base);
	return path.join(currentDir, relative);
}