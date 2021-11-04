import * as vscode from 'vscode';
import { DocumentDefinition } from './utils/readDocument';

export class HeptagonCodeLensProvider implements vscode.CodeLensProvider {
    mapDoc : Map<string, DocumentDefinition>;

    constructor(mapDoc : Map<string, DocumentDefinition>){
        this.mapDoc = mapDoc;
    }


    onDidChangeCodeLenses?: vscode.Event<void> | undefined;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        let docDef = this.mapDoc.get(document.fileName);
        let lens : vscode.CodeLens[] = [];

        if(docDef){
            docDef.functions.forEach(funcDef => {
                lens.push(new vscode.CodeLens(funcDef.range, {title : 'run', command : 'run', arguments : [funcDef.name]}));
                lens.push(new vscode.CodeLens(funcDef.range, {title : 'debug', command : 'debug', arguments : [funcDef.name, docDef]}));
            });
        }

        return lens;
    }

}