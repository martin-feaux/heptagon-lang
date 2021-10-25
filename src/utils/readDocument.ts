import { start } from 'repl';
import * as vscode from 'vscode';

//match comment (not multiline)
const regexComment = new RegExp('\\(\\*.*\\*\\)', 'g'); 
//none empty whitespace
const regexStrictWhiteSpace = new RegExp('^\\s+$', 'g');
//match seperation between variable name
const regexSeperation = new RegExp('[ \t,]', 'g'); 
//match begin function
const regexBeginFunc = new RegExp('(node|fun)', 'g');
//match begin var
const regexBeginVar = new RegExp('(var|const)', 'g');
//match any possible name for variable
const regexName = new RegExp('[a-zA-Z0-9_]+', 'g'); 
//match only possible name
const regexStrictName = new RegExp('^' + regexName.source + '$');
//match any declaration of a variables with their types (in node or behind var)
const regexVarType = new RegExp('(' + regexName.source + '|' + regexSeperation.source + '*)*:[ \t]*' + regexName.source + '(=[a-zA-Z0-9^ \t]*)?;?', 'g');
//match zero or more regexVarType between parantheses
const regexVarTypePar = new RegExp('\\((' + regexVarType.source + ')*\\)', 'g');
//match any node
const regexNode = new RegExp(regexBeginFunc.source + '[ \t]+' + regexName.source + regexVarTypePar.source + '[ \t]*returns[ \t]*' + regexVarTypePar.source, 'g');
//match any declaration of var
const regexVar = new RegExp('var[ \t]*(' + regexVarType.source + ')*', 'g'); 


type Variable = {
    name : string;
    type : string;
};

export type ReprFunction = {
    label : string;
    parameters : string[];
};

class VariableDefinition {
    variables : Variable[];
    range : vscode.Range;

    constructor(variables : Variable[], range : vscode.Range){
        this.variables = variables;
        this.range = range;
    }

    toType() : string {
        let repr = "";

        this.variables.forEach(variable => {
            repr += variable.type + " -> ";
        });

        if(repr){
            return repr.substring(0, repr.length - 4);
        }
        return repr;
    }

    hasVar(name : string) : boolean {
        let exist = false;

        this.variables.forEach(variable => {
            if(variable.name === name){
                exist = true;
            }
        });
        
        return exist;
    }

    getVarType(name : string) : string {
        let type = "";

        this.variables.forEach(variable => {
            if(variable.name === name){
                type = variable.type;
            }
        });

        return type;
    }

    toString() : string {
        let repr = "";

        this.variables.forEach(variable => {
            repr += variable.name + " : " + variable.type + ", ";
        });

        if(repr){
            return repr.substring(0, repr.length - 2);
        }
        return repr;
    }

    getVarString() : string[] {
        let vars : string[] = [];

        this.variables.forEach(variable => {
            vars.push(variable.name + " : " + variable.type);
        });

        return vars;
    }
}

class FunctionDefinition {
    name : string;
    parameters : VariableDefinition;
    outputs : VariableDefinition;
    localVar : VariableDefinition | null;
    range : vscode.Range;
    
    constructor(name : string, parameters: VariableDefinition, outputs : VariableDefinition, localVar : VariableDefinition | null, range : vscode.Range){
        this.name = name;
        this.parameters = parameters;
        this.outputs = outputs;
        this.localVar = localVar;
        this.range = range;
    }

    toType() : string {
        return "(" + this.parameters.toType() + ") -> (" + this.outputs.toType() + ")";
    }

    toString() : string {
        return this.name + "(" + this.parameters.toString() + ") -> (" + this.outputs.toType() + ")";
    }

    hasVar(name : string) : boolean {
        return this.parameters.hasVar(name) || this.outputs.hasVar(name) || (this.localVar !== null && this.localVar.hasVar(name));
    }

    getVarType(name : string) : string {
        if(this.parameters.hasVar(name)){
            return this.parameters.getVarType(name);
        }else if(this.outputs.hasVar(name)){
            return this.outputs.getVarType(name);
        }else if(this.localVar && this.localVar.hasVar(name)){
            return this.localVar.getVarType(name);
        }

        return "";
    }

    isIn(position : vscode.Position) : boolean {
        let aboveStart = position.line > this.range.start.line || 
            (position.line === this.range.start.line && position.character >= this.range.start.character);
        let underEnd = position.line < this.range.end.line || 
            (position.line === this.range.end.line && position.character <= this.range.end.character);

        return aboveStart && underEnd;
    }
}

export class DocumentDefinition {
    name : string;
    functions : FunctionDefinition[];
    constVar : VariableDefinition[];

    constructor(name : string, functions : FunctionDefinition[], constVar : VariableDefinition[]){
        this.name = name;
        this.functions = functions;
        this.constVar = constVar;
    }

    update(document : vscode.TextDocument, changes : readonly vscode.TextDocumentContentChangeEvent[]){
        changes.forEach(change => {
            let start = change.range.start;
            let end = change.range.end;
            let regexReturn = new RegExp('\n', 'g');
            let lineChange = (end.line - start.line) + (change.text.match(regexReturn) || []).length;
            let lowBoundary = new vscode.Position(0, 0);
            let endChar = document.lineAt(document.lineCount - 1).range.end.character;
            let highBoundary = new vscode.Position(document.lineCount - 1, endChar);

            for(let i = 0; i < this.functions.length; i++){
                let funcDef = this.functions[i];
                if(funcDef.range.start.line > end.line){
                    let newStart = new vscode.Position(funcDef.range.start.line + lineChange, funcDef.range.start.character);
                    let newEnd = new vscode.Position(funcDef.range.end.line + lineChange, funcDef.range.end.character);
                    funcDef.range = new vscode.Range(newStart, newEnd);

                    if(newStart.line < highBoundary.line){
                        highBoundary = newStart;
                    }
                }else if(funcDef.range.end.line < start.line){
                    if(funcDef.range.end.line > lowBoundary.line){
                        lowBoundary = funcDef.range.end;
                    }
                }else{
                    //we can't know exactly what happends so we will recalculate the function
                    this.functions.splice(i);
                    i--;
                }
            }

            let currLine = lowBoundary.line;
            while(currLine < highBoundary.line){
                let text = document.lineAt(currLine).text;

                if(text.match(regexBeginFunc)){
                    let tmp = functionFactory(document, new vscode.Position(currLine, 0));
                    if(tmp){
                        this.functions.push(tmp);

                        currLine = tmp.range.end.line;
                    }
                }
                currLine++;
            }
        });
    }

    getFunctionRepr(name : string) : ReprFunction{
        let repr : ReprFunction = {label : "", parameters : []};

        this.functions.forEach(funcDef => {
            if(funcDef.name === name){
                repr.label = funcDef.toString();
                repr.parameters = funcDef.parameters.getVarString();
            }
        });

        return repr;
    }

    getTypeAny(name : string, position : vscode.Position) : string {
        let type = "";

        //search first if its a function
        this.functions.forEach(funcDef => {
            if(funcDef.name === name){
                type = funcDef.toType();
            }
        });

        if(type){
            return type;
        }

        //search if its a local var
        this.functions.forEach(funcDef => {
            if(funcDef.isIn(position) && funcDef.hasVar(name)){
                type = funcDef.getVarType(name);
            }
        });

        if(type){
            return type;
        }

        return "";
    }
}

function nextWordOfLine(line : string, startCharacter : number) : number {
    let endCharacter = startCharacter+2;
    let word = line.substring(startCharacter, endCharacter);

    while((word.match(regexStrictName) || word.match(regexStrictWhiteSpace))
        && endCharacter < line.length){
        endCharacter++;
        word = line.substring(startCharacter, endCharacter);
    }

    if(endCharacter >= line.length){
        return endCharacter;
    }
    return --endCharacter;
}

function variableDefinitionFactory(document : vscode.TextDocument, range : vscode.Range) : VariableDefinition {
    let variables : Variable[] = [];
    let text = document.getText(range);
    let comments = text.matchAll(regexComment);
    
    for(let comment of comments){
        text.replace(comment[0], "");
    }

    let varBlocks = text.split(";");

    varBlocks.forEach(block => {
        let tmpBlock = block.split(":");

        if(tmpBlock.length === 2){
            let tmpType = tmpBlock[1].match(regexName);

            if(tmpType){
                let type = tmpType[0];

                let varNames = tmpBlock[0].matchAll(regexName);
                
                for(let name of varNames){
                    variables.push({"name" : name[0], "type" : type});
                }
            }
        }
    });

    return new VariableDefinition(variables, range);
}

function functionFactory(document : vscode.TextDocument, startPos : vscode.Position) : FunctionDefinition | null{
    let name : string | null = null;
    let parameters : VariableDefinition | null = null;
    let outputs : VariableDefinition | null = null;
    let localVar : VariableDefinition | null = null;
    let endPos : vscode.Position;

    let line = document.lineAt(startPos.line);
    let endLine = startPos.line;
    let currChar = startPos.character;
    let endChar = 0;
    let word;
    let nbPar = 0;
    let beginPar = new vscode.Position(endLine, 0);
    let beginVar = new vscode.Position(endLine, 0);
    let isEntryHere : boolean = false; //node or fun start the construction
    let isNameHere : boolean = false; //node name (mandatory)
    let isParamHere : boolean = false; //parameters are here (can have none)
    let isOutputHere : boolean = false; //output is here (can have none)
    let isLocalHere : boolean = false; //local var is here (can be false)
    let isBegin : boolean = false; //first let found
    let isEnd : boolean = false; //final tel found

    while(!isEnd){
        while(currChar < line.range.end.character){
            endChar = nextWordOfLine(line.text, currChar);
            word = line.text.substring(currChar, endChar);

            if(!isEntryHere){ //function did not start
                isEntryHere = word.match(regexBeginFunc) !== null;
            }else if(!isNameHere){
                let tmp = word.match(regexName);
                if(tmp){
                    isNameHere = true;
                    name = tmp[0];
                }
            }else if(!isParamHere || !isOutputHere){
                if(word.match('\\(')){
                    if(nbPar === 0){
                        beginPar = new vscode.Position(endLine, currChar);
                    }

                    nbPar++;
                }else if(word.match('\\)')){
                    nbPar--;

                    if(nbPar === 0){
                        let varDef = variableDefinitionFactory(document, new vscode.Range(beginPar, new vscode.Position(endLine, endChar)));

                        if(!isParamHere){
                            isParamHere = true;
                            parameters = varDef;
                        }else{
                            isOutputHere = true;
                            outputs = varDef;
                        }
                    }
                }
            }else if(!isLocalHere){
                if(word.match(regexBeginVar)){
                    beginVar = new vscode.Position(endLine, endChar);
                    isLocalHere = true;
                }
            }

            if(!isBegin && word.match('^let$')){
                isBegin = true;

                if(isLocalHere){
                    let varDef = variableDefinitionFactory(document, new vscode.Range(beginVar, new vscode.Position(endLine, currChar)));
                    localVar = varDef;
                }
            }else if(word.match('^tel$')){
                isEnd = true;
                endLine--; //because line will be incremented one more time
            }

            currChar = endChar;
        }
        endLine++;
        currChar = 0;

        if(endLine >= document.lineCount){
            return null;
        }

        line = document.lineAt(endLine);
    }

    endPos = new vscode.Position(endLine, endChar);

    if(name && parameters && outputs){
        return new FunctionDefinition(name, parameters, outputs, localVar, new vscode.Range(startPos, endPos));
    }
    return null;
}

export function documentFactory(document : vscode.TextDocument) : DocumentDefinition{
    let functions : FunctionDefinition[] = [];
    let constVar : VariableDefinition[] = [];

    let currLine = 0;

    while(currLine < document.lineCount){
        let text = document.lineAt(currLine).text;

        if(text.match(regexBeginFunc)){
            let tmp = functionFactory(document, new vscode.Position(currLine, 0));
            if(tmp){
                functions.push(tmp);

                currLine = tmp.range.end.line;
            }
        }

        currLine++;
    }

    return new DocumentDefinition(document.fileName, functions, constVar);
}