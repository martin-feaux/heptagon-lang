import * as vscode from 'vscode';
import { DocumentDefinition } from './utils/readDocument';

export class HeptagonHoverProvider implements vscode.HoverProvider {
    mapDoc : Map<string, DocumentDefinition>;

    constructor(mapDoc : Map<string, DocumentDefinition>){
        this.mapDoc = mapDoc;
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let range = document.getWordRangeAtPosition(position);
        let docDef = this.mapDoc.get(document.fileName);

        if(range && docDef){
            return new vscode.Hover(docDef.getTypeAny(document.getText(range), position));
        }
        
        return null;
    }

}