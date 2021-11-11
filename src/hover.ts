import * as vscode from 'vscode';
import { DocumentDefinition } from './utils/readDocument';

export class HeptagonHoverProvider implements vscode.HoverProvider {
    mapDoc : Map<string, DocumentDefinition>;

    constructor(mapDoc : Map<string, DocumentDefinition>){
        this.mapDoc = mapDoc;
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let name = document.fileName.split('/');
        let docDef = this.mapDoc.get(name[name.length - 1].replace(".ept", ""));

        if(docDef){
            return new vscode.Hover(docDef.getTypeAny(document, position, this.mapDoc));
        }
        
        return null;
    }

}