// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { parseFunction } from './utils/readDocument';
import { HeptagonSignatureProvider } from './signature';
import { HeptagonHoverProvider } from './hover';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "heptagon" is now active!');

	let hover = vscode.languages.registerHoverProvider('heptagon', new HeptagonHoverProvider());

	let signature = vscode.languages.registerSignatureHelpProvider('heptagon', new HeptagonSignatureProvider(), '(');

	context.subscriptions.push(hover);
	context.subscriptions.push(signature);
}

// this method is called when your extension is deactivated
export function deactivate() {}


