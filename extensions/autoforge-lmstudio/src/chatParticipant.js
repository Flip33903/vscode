"use strict";
/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - Chat participant / agent backed by LM Studio
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
exports.registerChatParticipant = registerChatParticipant;
const vscode = __importStar(require("vscode"));
const lmStudioClient_1 = require("./lmStudioClient");
const SYSTEM_PROMPT = `You are AutoForge Agent, a local coding assistant running inside a VS Code fork.
You help with reading, writing, and refactoring code. Prefer concise, actionable answers.
When suggesting edits, use markdown code blocks with language tags.`;
function registerChatParticipant(disposables) {
    const client = new lmStudioClient_1.LMStudioClient();
    const participant = vscode.chat.createChatParticipant('autoforge.agent', async (request, _context, stream, token) => {
        const editor = vscode.window.activeTextEditor;
        const selection = editor?.document.getText(editor.selection);
        const activeFile = editor?.document.uri.fsPath;
        let userPrompt = request.prompt;
        if (request.command === 'explain') {
            userPrompt = selection
                ? `Explain this code:\n\n\`\`\`\n${selection}\n\`\`\``
                : `Explain the active file${activeFile ? ` (${activeFile})` : ''}.`;
        }
        else if (request.command === 'fix') {
            userPrompt = selection
                ? `Find and fix issues in this code. Return the corrected code:\n\n\`\`\`\n${selection}\n\`\`\``
                : `Review and fix issues in the active file${activeFile ? ` (${activeFile})` : ''}.`;
        }
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ];
        for await (const chunk of client.streamChatCompletions(messages, {}, token)) {
            stream.markdown(chunk);
        }
    });
    participant.iconPath = new vscode.ThemeIcon('sparkle');
    disposables.push(participant);
}
//# sourceMappingURL=chatParticipant.js.map