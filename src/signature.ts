import * as vscode from 'vscode';
import { parseFunction, parseMultiLine } from './utils/readDocument';


class HeptagonInformation implements vscode.SignatureInformation {
    startPos : vscode.Position;
    label: string;
    documentation?: string | vscode.MarkdownString | undefined;
    parameters: vscode.ParameterInformation[];
    activeParameter?: number | undefined;

    constructor(document : vscode.TextDocument, position : vscode.Position){
        this.startPos = position;
        this.parameters = [];

        let parsedFunc = parseFunction(document, position);

        if(parsedFunc.length > 0){
            this.label = parsedFunc[0];

            for(let i = 1; i < parsedFunc.length; i++){
                this.addParameter(parsedFunc[i]);
            }
        }else{
            throw new Error("couldn't be parse");
        }
    }

    addParameter(parameter : string){
        this.parameters.push(new vscode.ParameterInformation(parameter));
    }

    updateActiveParameter(document : vscode.TextDocument, position : vscode.Position){
        let parse = parseMultiLine(document, this.startPos, position);
        this.activeParameter = (parse.match(/,/g) || []).length;
    }

    isOut(position : vscode.Position) : boolean {
        return this.startPos.line >= position.line && this.startPos.character > position.character;
    }
}

export class HeptagonSignatureProvider implements vscode.SignatureHelpProvider{
    nodeSignature : Map<string, HeptagonInformation>;

    constructor(){
        this.nodeSignature = new Map();
    }

    findFunction(document: vscode.TextDocument, position : vscode.Position, namePossible? : string[] | null) : string {
        let line = position.line;
        let character = position.character;
        let token = document.lineAt(line).text.substring(character-1, character);
        let parClose = 0;

        while(token !== '(' || parClose > 0){
            if(token === ')'){
                parClose++;
            }else if(token === '('){
                parClose--;
            }

            if(character === 0){
                line--;
                if(line < 0){
                    break;
                }

                character = document.lineAt(line).range.end.character;
            }else{
                character--;
            }
            token = document.lineAt(line).text.substring(character-1, character);
        }

        if(line >= 0){
            let range = document.getWordRangeAtPosition(new vscode.Position(line, character-1));

            if(range){
                let name = document.lineAt(range.start.line).text.substring(range.start.character, range.end.character);

                if(namePossible && !namePossible.includes(name)){
                    if(character === 0){
                        line--;
                        if(line < 0){
                            return "";
                        }

                        character = document.lineAt(line).range.end.character;
                    }else{
                        character--;
                    }
                    return this.findFunction(document, new vscode.Position(line, character), namePossible);
                }

                return name; 
            }
        }
        return "";
    }

    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp> {        
        let signHelp = new vscode.SignatureHelp;
        let currChar = document.lineAt(position.line).text.substring(position.character-1, position.character);
        let name = this.findFunction(document, position);

        if(name === ""){
            //no methode was ever opened
            return null;
        }

        if(currChar === '('){
            //opening new method signature, if none fund then there was no methode open
            let signInfo;
            try{
                signInfo = new HeptagonInformation(document, position);
                this.nodeSignature.set(name, signInfo);
            }catch(e){
                //was not initialize
            }
        }

        if(this.nodeSignature.size > 0){
            name = this.findFunction(document, position);
            let signInfo = this.nodeSignature.get(name);

            if(signInfo){
                signInfo.updateActiveParameter(document, position);
                signHelp.signatures.push(signInfo);
            }          
        }else{
            //no method signature left
            return null;
        }
        
        return signHelp;
    }
}