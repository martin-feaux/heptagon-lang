// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { documentFactory, DocumentDefinition } from './utils/readDocument';
import { HeptagonSignatureProvider } from './signature';
import { HeptagonHoverProvider } from './hover';
import { HeptagonCodeLensProvider } from './codeLens';
import { HeptagonTerminalManager } from './HeptagonTerminalManager';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "heptagon" is now active!');
	let mapDocument = new Map<string, DocumentDefinition>();

	let textDocuments = vscode.workspace.textDocuments;

	textDocuments.forEach(document => {
		let name = document.fileName.split('/');
		mapDocument.set(name[name.length-1].replace(".ept", ""), documentFactory(document));
	});

	let docChange = vscode.workspace.onDidChangeTextDocument(function (document) {
		let docDef = mapDocument.get(document.document.fileName);

		if(docDef){
			docDef.update(document.document, document.contentChanges);
		}
	});

	let openDoc = vscode.workspace.onDidOpenTextDocument(function (document){
		let name = document.fileName.split('/');
		mapDocument.set(name[name.length-1].replace(".ept", ""), documentFactory(document));
	});

	let closeDoc = vscode.workspace.onDidCloseTextDocument(function (document){
		let name = document.fileName.split('/');
		mapDocument.delete(name[name.length-1].replace(".ept", ""));
	});
	

	let hover = vscode.languages.registerHoverProvider('heptagon', new HeptagonHoverProvider(mapDocument));

	let signature = vscode.languages.registerSignatureHelpProvider('heptagon', new HeptagonSignatureProvider(mapDocument), '(');

	let codeLens = vscode.languages.registerCodeLensProvider('heptagon', new HeptagonCodeLensProvider(mapDocument));

	let heptagonTerminalManager = new HeptagonTerminalManager();

	let compile = vscode.commands.registerCommand('heptagon.compile', () => {
		heptagonTerminalManager.compile(false, false);
	});

	let run = vscode.commands.registerCommand('run', (node : string) => {
		heptagonTerminalManager.run(node);
	});

	let debug = vscode.commands.registerCommand('debug', (node, eptProgramme) => {
		heptagonTerminalManager.debug(node, eptProgramme);
	});

	context.subscriptions.push(openDoc);
	context.subscriptions.push(closeDoc);
	context.subscriptions.push(docChange);

	context.subscriptions.push(hover);
	context.subscriptions.push(signature);
	context.subscriptions.push(codeLens);

	context.subscriptions.push(compile);
	context.subscriptions.push(run);
	context.subscriptions.push(heptagonTerminalManager);
}

// this method is called when your extension is deactivated
export function deactivate() {}


