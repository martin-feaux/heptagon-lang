import * as vscode from 'vscode';

//match comment (not multiline)
const regexComment = new RegExp('\\(\\*.*\\*\\)'); 
//match seperation between variable name
const regexSeperation = new RegExp('[ \t,]'); 
//match any possible name for variable
const regexName = new RegExp('[a-zA-Z0-9_]+'); 
//match any declaration of a variables with their types (in node or behind var)
const regexVarType = new RegExp('(' + regexName.source + '|' + regexSeperation.source + '*)*:[ \t]*' + regexName.source + ';?');
//match zero or more regexVarType between parantheses
const regexVarTypePar = new RegExp('\\((' + regexVarType.source + ')*\\)');
//match any node
const regexNode = new RegExp('(node|fun)[ \t]+' + regexName.source + regexVarTypePar.source + '[ \t]*returns[ \t]*' + regexVarTypePar.source);
//match any declaration of var
const regexVar = new RegExp('var[ \t]*(' + regexVarType.source + ')*'); 


export function parseMultiLine(document : vscode.TextDocument, position1 : vscode.Position, position2 : vscode.Position) : string{
    let text = "";

    if(position1.line === position2.line){
        text = document.lineAt(position1.line).text.substring(position1.character, position2.character);
    }else{
        text = document.lineAt(position1.line).text.substring(position1.character);

        for (let i = position1.line; i < position2.line; i++) {
            text = text + document.lineAt(i).text;      
        }

        text = text + document.lineAt(position2.line).text.substring(0, position2.character);
    }

    return text;
}

function splitVarName(input : string) : Array<string> {
    let regLine = new RegExp('[a-zA-Z0-9_, \t]+:[a-zA-Z0-9_ \t]+;?', 'g');
    let regName = new RegExp('[a-zA-Z0-9_]+', 'g');
    let parseResult = [...input.matchAll(regLine)];
    let result: string[] = [];

    parseResult.forEach(element => {
        let split = element[0].split(":");
        let matchType = split[1].match(regName);
        let type = matchType? matchType[0] : "";

        let parseName = [...split[0].matchAll(regName)];
        parseName.forEach(name => {
            result.push(name[0] + " : " + type);
        });
    });
    return result;
}

function getFuncLine(name: string, document : vscode.TextDocument, position : vscode.Position) : string {
    let regFunc = new RegExp('(node|fun)[ \t]+' + name);
    let regEnd = new RegExp('(var|let)');
    let line = position.line;
    let matchFunc = null;
    let matchEnd = null;

    while(line > -1 && matchFunc === null){
        let text = document.lineAt(line).text;
        matchFunc = text.match(regFunc);
        line--;
    }
    line++;
    let begining = new vscode.Position(line, 0);

    while(line < document.lineCount && matchEnd === null){
        let text = document.lineAt(line).text;
        matchEnd = text.match(regEnd);
        line++;
    }
    let ending = new vscode.Position(line-1, document.lineAt(line-1).range.end.character);

    if(line === document.lineCount){
        //end of the function was never found
        return "";
    }else{
        return parseMultiLine(document, begining, ending);
    }
}

export function parseFunction(document : vscode.TextDocument, position : vscode.Position): Array<string>{
    let pos2 = new vscode.Position(position.line, position.character - 1);
    let range = document.getWordRangeAtPosition(pos2);
    let funcName: string | null = null;
    if(range){
        funcName = document.lineAt(range.start.line).text.substring(range.start.character, range.end.character);

        if(funcName){
            let input = getFuncLine(funcName, document, pos2);
            
            if(input){
                let regPar = new RegExp('\\([a-zA-Z0-9_,:; \t]*\\)', 'g');
                let result = [...input.matchAll(regPar)];
                let postResult: string[] = [];
                
                funcName += "(";

                let param = splitVarName(result[0][0]);
                

                for (let i = 0; i < param.length; i++) {
                    const element = param[i];
                    postResult.push(element);

                    if(i > 0){
                        funcName += ", " + element;
                    }else{
                        funcName += element;
                    }
                }
                
                funcName += ') -> ' + result[1][0];
                postResult.unshift(funcName);
                
                return postResult;
            }
        }
    }

    return [];
}

/*
export function findDefPos(name : string, document : vscode.TextDocument, position : vscode.Position) : vscode.Range {


    return new vscode.Range();
}
*/