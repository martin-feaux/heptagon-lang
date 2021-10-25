import * as vscode from 'vscode';
import * as os from 'os';
import { execSync, spawnSync } from 'child_process';

const tmp = os.tmpdir();

export class HeptagonTerminalManager implements vscode.Disposable {
    private terminal : vscode.Terminal | null;
    private outputChannel : vscode.OutputChannel;
    private config : vscode.WorkspaceConfiguration;
    private document : vscode.TextDocument | null;
    private outputDir : vscode.Uri;

    constructor(){
        this.terminal = null;
        this.outputChannel = vscode.window.createOutputChannel('heptagon');
        this.config = vscode.workspace.getConfiguration('heptagon');
        this.document = null;
        this.outputDir = vscode.Uri.parse("");
    }
    
    dispose() {
        if(this.terminal){
            this.terminal.dispose();
        }
    }

    closeTerminal() {
        this.terminal = null;
    }

    initialize() {
        if(vscode.window.activeTextEditor){
            this.document = vscode.window.activeTextEditor.document;
        }else{
            return;
        }

        this.config = vscode.workspace.getConfiguration('heptagon');

        if(this.config.get<boolean>("autoSave")){
            this.document.save();
        }
        
        if(this.config.get<boolean>('cleanTerminal')){
            this.outputChannel.clear();
        }
    }

    initTerminal(){
        if(!this.terminal){
            this.terminal = vscode.window.createTerminal('heptagon');
        }else if(this.config.get<boolean>('cleanTerminal')){
            this.terminal.sendText("clear");
        }
        this.terminal.show();
    }

    compile(temporary : boolean, node? : string) : boolean{
        this.initialize();

        if(!this.document || this.document.languageId !== 'heptagon'){
            vscode.window.showInformationMessage('No active heptagon document, select a correct document');
            return false;
        }

        if(!vscode.workspace.workspaceFolders){
            vscode.window.showInformationMessage('Open the file in a worskspace folder before compiling');
            return false;
        }

        let command : string = "";
        let isLanguageC = this.config.get<string>('targetLanguage') === 'c';
        let tmpCommand = this.config.get<string>('compilerHeptc');

        if(tmpCommand){
            command = tmpCommand;
        }

        if(this.config.get<boolean>('verboseCompiling')){
            command += " -v";
        }

        let fileName = this.document.fileName.substring(0, this.document.fileName.length - 4).replace(
            vscode.workspace.workspaceFolders[0].uri.fsPath, '');
        fileName += isLanguageC ? '_c' : '_java';

        if(this.config.get<string>("outputDir")){
            let output = this.config.get<string>('outputDir');

            if(output){
                this.outputDir = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, output);
                command += " -targetpath " + this.outputDir.fsPath;
                this.outputDir = vscode.Uri.joinPath(this.outputDir, fileName);
            }
        }else if(temporary){
            this.outputDir = vscode.Uri.joinPath(vscode.Uri.parse(tmp), "heptagon-compil-result");
            let t= spawnSync('test ! -d ' + this.outputDir.fsPath + ' && mkdir ' + this.outputDir.fsPath, {shell : true});
            command += " -targetpath " + this.outputDir.fsPath;
            this.outputDir = vscode.Uri.joinPath(this.outputDir, fileName);
        }else{
            this.outputDir = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, fileName);
        }

        if(isLanguageC){
            command += ' -target c';
        }else{
            command += ' -target java';
        }

        if(node){
            command += " -s " + node;
        }

        let options = this.config.get<string>('supplementaryOptions');

        if(options){
            command += options;
        }

        command += ' ' + this.document.fileName;

        let compileResult = spawnSync(command, {shell : true, encoding : "utf-8"});
        
        if(compileResult.stdout.length > 0 || compileResult.stderr.length > 0){
            this.outputChannel.show();
            this.outputChannel.appendLine(compileResult.stdout);

            this.outputChannel.appendLine('error during the compiling');
            this.outputChannel.appendLine(compileResult.stderr);
        }

        if(compileResult.stderr.length > 0){
            return false;
        }

        if(isLanguageC){
            return this.compileC(node);
        }
        
        return true;
    }

    compileC(node? : string) : boolean{
        let command : string = "";
        let tmpCommand = this.config.get<string>('compilerC');
        if(tmpCommand){
            command = tmpCommand;
        }

        let compileResult = spawnSync(command, {shell : true, encoding : "utf-8", cwd : this.outputDir.fsPath});
        
        if(compileResult.stdout.length > 0 || compileResult.stderr.length > 0){
            this.outputChannel.show();
            this.outputChannel.appendLine(compileResult.stdout);

            this.outputChannel.appendLine('error during the compiling');
            this.outputChannel.appendLine(compileResult.stderr);
        }

        if(compileResult.stderr.length > 0){
            return false;
        }

        if(node && this.document && vscode.workspace.workspaceFolders){
            let fileNameFragment = this.document.fileName.substring(0, this.document.fileName.length - 4).split('/');
            let fileName = fileNameFragment[fileNameFragment.length - 1];
            let command = "gcc -o " + node + ' _main.o ' + fileName + '.o';

            compileResult = spawnSync(command, {shell : true, encoding : "utf-8", cwd : this.outputDir.fsPath});
        
            if(compileResult.stdout.length > 0 || compileResult.stderr.length > 0){
                this.outputChannel.show();
                this.outputChannel.appendLine(compileResult.stdout);

                this.outputChannel.appendLine('error during the compiling');
                this.outputChannel.appendLine(compileResult.stderr);
            }

            if(compileResult.stderr.length > 0){
                return false;
            }
        }

        return true;
    }

    compileJava(file : vscode.Uri, targetPath : vscode.Uri, node : string | null){

    }

    run(node :string){
        if(node === ""){
            return;
        }

        let compiled = this.compile(true, node);

        if(compiled){
            this.initTerminal();

            if(!this.terminal){
                vscode.window.showInformationMessage('Terminal did not open');
                return false;
            }

            let isLanguageC = this.config.get<string>('targetLanguage') === 'c';
            let commandLoc = "cd " + this.outputDir.fsPath;
            let command = "";

            if(isLanguageC){
                command = "./" + node;
            }

            if(this.terminal){
                this.terminal.sendText(commandLoc);
                this.terminal.sendText(command);
            }
        }
    }

}