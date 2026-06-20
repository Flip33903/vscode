"use strict";
/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - LM Studio integration entry point
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const lmStudioClient_1 = require("./lmStudioClient");
const chatParticipant_1 = require("./chatParticipant");
const inlineCompletionProvider_1 = require("./inlineCompletionProvider");
const languageModelProvider_1 = require("./languageModelProvider");
function activate(context) {
    const disposables = [];
    const onModelsChanged = new vscode.EventEmitter();
    disposables.push(onModelsChanged);
    (0, languageModelProvider_1.registerLanguageModelProvider)(disposables, onModelsChanged);
    (0, inlineCompletionProvider_1.registerInlineCompletionProvider)(disposables);
    (0, chatParticipant_1.registerChatParticipant)(disposables);
    disposables.push(vscode.commands.registerCommand('autoforge.lmstudio.testConnection', async () => {
        const client = new lmStudioClient_1.LMStudioClient();
        const result = await client.testConnection();
        if (result.ok) {
            vscode.window.showInformationMessage(`AutoForge: ${result.message}`);
        }
        else {
            vscode.window.showErrorMessage(`AutoForge: ${result.message}`);
        }
    }));
    context.subscriptions.push(...disposables);
}
function deactivate() {
    // subscriptions disposed automatically
}
//# sourceMappingURL=extension.js.map