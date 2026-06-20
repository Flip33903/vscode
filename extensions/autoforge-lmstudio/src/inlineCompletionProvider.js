"use strict";
/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - Inline completion provider via LM Studio /v1/completions
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
exports.registerInlineCompletionProvider = registerInlineCompletionProvider;
const vscode = __importStar(require("vscode"));
const lmStudioClient_1 = require("./lmStudioClient");
function registerInlineCompletionProvider(disposables) {
    const client = new lmStudioClient_1.LMStudioClient();
    const provider = {
        async provideInlineCompletionItems(document, position, _context, token) {
            const config = vscode.workspace.getConfiguration('autoforge.lmstudio');
            if (!config.get('enableInlineCompletions', true)) {
                return undefined;
            }
            const prefixRange = new vscode.Range(new vscode.Position(Math.max(0, position.line - 40), 0), position);
            const suffixRange = new vscode.Range(position, new vscode.Position(Math.min(document.lineCount - 1, position.line + 20), Number.MAX_SAFE_INTEGER));
            const prefix = document.getText(prefixRange);
            const suffix = document.getText(suffixRange);
            // FIM-style prompt works well with code models (Qwen Coder, DeepSeek Coder, etc.)
            const prompt = `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`;
            try {
                const completion = await client.complete(prompt, {
                    temperature: Math.min((0, lmStudioClient_1.getConfig)().temperature, 0.4),
                    maxTokens: 128,
                    stop: ['\n\n', '<|fim_prefix|>', '<|fim_suffix|>', '<|fim_middle|>'],
                }, token);
                const insertText = completion.trimEnd();
                if (!insertText) {
                    return undefined;
                }
                return [new vscode.InlineCompletionItem(insertText, new vscode.Range(position, position))];
            }
            catch {
                return undefined;
            }
        },
    };
    disposables.push(vscode.languages.registerInlineCompletionItemProvider({ pattern: '**/*' }, provider));
}
//# sourceMappingURL=inlineCompletionProvider.js.map