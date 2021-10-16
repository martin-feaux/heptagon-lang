// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { parseFunction, documentFactory, DocumentDefinition } from './utils/readDocument';
import { HeptagonSignatureProvider } from './signature';
import { HeptagonHoverProvider } from './hover';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "heptagon" is now active!');
	let mapDocument = new Map<string, DocumentDefinition>();

	let textDocuments = vscode.workspace.textDocuments;

	textDocuments.forEach(document => {
		mapDocument.set(document.fileName, documentFactory(document));
	});

	let docChange = vscode.workspace.onDidChangeTextDocument(function (document) {
		let docDef = mapDocument.get(document.document.fileName);

		if(docDef){
			docDef.update(document.document, document.contentChanges);
		}
	});

	let openDoc = vscode.workspace.onDidOpenTextDocument(function (document){
		mapDocument.set(document.fileName, documentFactory(document));
	});

	let closeDoc = vscode.workspace.onDidCloseTextDocument(function (document){
		mapDocument.delete(document.fileName);
	});

	let hover = vscode.languages.registerHoverProvider('heptagon', new HeptagonHoverProvider());

	let signature = vscode.languages.registerSignatureHelpProvider('heptagon', new HeptagonSignatureProvider(mapDocument), '(');

	context.subscriptions.push(openDoc);
	context.subscriptions.push(closeDoc);
	context.subscriptions.push(docChange);
	
	context.subscriptions.push(hover);
	context.subscriptions.push(signature);
}

// this method is called when your extension is deactivated
export function deactivate() {}


