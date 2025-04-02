import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { existsSync } from "node:fs";

const folderPath = `${__dirname}/../../../../Lib/src`; // Directory containing Lib TypeScript files
const corePath = `${__dirname}/../../../../Core/src`; // Directory containing Core TypeScript files
const discordPath = `${__dirname}/../../../../Discord/src/packetHandlers/handlers`; // Directory containing Discord TypeScript files

const parentTypes = new Map<string, string>();
const typeHasDecorator = new Map<string, boolean>();
const backToFrontPackets = new Array<string>();
const frontToBackPackets = new Array<string>();
const nonePackets = new Array<string>();
const coreImplementedPackets = new Array<string>();
const discordImplementedPackets = new Array<string>();

function checkForDecorators(filePath: string): void {
	const sourceCode = fs.readFileSync(filePath, "utf8");
	const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.ESNext, true);

	function visit(node: ts.Node): void {
		if (ts.isClassDeclaration(node) && node.heritageClauses) {
			// eslint-disable-next-line
			parentTypes.set(node.name!.escapedText.toString(), (node.heritageClauses[0].types[0].expression as any).escapedText as string);
			// eslint-disable-next-line
			if (node.modifiers && node.modifiers.length > 0 && node.modifiers.some(modifier => (modifier as any)?.expression?.expression?.escapedText === "sendablePacket")) {
				typeHasDecorator.set(node.name!.escapedText.toString(), true);

				// eslint-disable-next-line
				const directionName = (node.modifiers[0] as any)?.expression.arguments[0].name.escapedText;
				if (directionName === "BACK_TO_FRONT") {
					backToFrontPackets.push(node.name!.escapedText.toString());
				}
				else if (directionName === "FRONT_TO_BACK") {
					frontToBackPackets.push(node.name!.escapedText.toString());
				}
				else {
					nonePackets.push(node.name!.escapedText.toString());
				}
			}
			else {
				typeHasDecorator.set(node.name!.escapedText.toString(), false);
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
}

function checkForPacketHandlers(filePath: string, array: Array<string>): void {
	const sourceCode = fs.readFileSync(filePath, "utf8");
	const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.ESNext, true);

	function visit(node: ts.Node): void {
		if (ts.isCallExpression(node) && ["packetHandler", "commandRequires"].some(v => v === node.expression.getText())) {
			// eslint-disable-next-line
			const packetType = (node as any).arguments[0].escapedText;
			array.push(packetType);
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
}

function walkDirectory(dir: string, callback: (fullPath: string) => void): void {
	fs.readdirSync(dir).forEach(file => {
		const fullPath = path.join(dir, file);
		const stat = fs.statSync(fullPath);

		if (stat.isDirectory()) {
			walkDirectory(fullPath, callback);
		}
		else if (fullPath.endsWith(".ts")) {
			callback(fullPath);
		}
	});
}

function isDraftBotPacket(packetName: string): boolean {
	if (parentTypes.has(packetName)) {
		return isDraftBotPacket(parentTypes.get(packetName)!);
	}

	return packetName === "DraftBotPacket";
}

// Try only if we are in a dev environment
if (existsSync(folderPath)) {
	walkDirectory(folderPath, checkForDecorators);

	let error = false;
	console.log("Verifying packets decorators...");

	for (const packet of parentTypes.keys()) {
		if (isDraftBotPacket(packet) && !typeHasDecorator.get(packet)) {
			console.error(`Packet decorator missing on packet: ${packet}`);
			error = true;
		}
	}

	if (error) {
		process.exit(1);
	}

	console.log("All packets decorators OK");
}

// Verify core if we are in a dev environment
if (existsSync(corePath)) {
	walkDirectory(corePath, fullPath => checkForPacketHandlers(fullPath, coreImplementedPackets));

	let error = false;
	console.log("Verifying core packets handlers...");

	for (const packet of frontToBackPackets) {
		if (!coreImplementedPackets.includes(packet)) {
			console.error(`No handler found for packet: ${packet}`);
			error = true;
		}
	}

	for (const packet of coreImplementedPackets) {
		if (!frontToBackPackets.includes(packet)) {
			console.error(`Handler found for a packet not FRONT_TO_BACK: ${packet}`);
			error = true;
		}
	}

	if (error) {
		process.exit(1);
	}

	console.log("All core packets handlers OK");
}

// Verify discord if we are in a dev environment
if (existsSync(discordPath)) {
	walkDirectory(discordPath, fullPath => checkForPacketHandlers(fullPath, discordImplementedPackets));

	let error = false;
	console.log("Verifying discord packets handlers...");

	for (const packet of backToFrontPackets) {
		if (!discordImplementedPackets.includes(packet)) {
			console.error(`No handler found for packet: ${packet}`);
			error = true;
		}
	}

	for (const packet of discordImplementedPackets) {
		if (!backToFrontPackets.includes(packet)) {
			console.error(`Handler found for a packet not BACK_TO_FRONT: ${packet}`);
			error = true;
		}
	}

	if (error) {
		process.exit(1);
	}

	console.log("All discord packets handlers OK");
}
