import * as vscode from 'vscode';
import { parseFunction, parseMultiLine } from './utils/readDocument';

export class HeptagonHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let range = document.getWordRangeAtPosition(position);
        if(range){
            let word = document.lineAt(position).text.substring(range.start.character, range.end.character);
            return new vscode.Hover(word);
        }
        
        return null;
    }

}