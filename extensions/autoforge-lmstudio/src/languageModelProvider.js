"use strict";
/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - VS Code Language Model provider backed by LM Studio
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
exports.registerLanguageModelProvider = registerLanguageModelProvider;
const vscode = __importStar(require("vscode"));
const lmStudioClient_1 = require("./lmStudioClient");
const VENDOR = 'lmstudio';
function registerLanguageModelProvider(disposables, onModelsChanged) {
    const client = new lmStudioClient_1.LMStudioClient();
    let cachedModels = [];
    async function refreshModels() {
        const config = (0, lmStudioClient_1.getConfig)();
        const lmModels = await client.listModels();
        cachedModels = lmModels.map((m, index) => ({
            id: m.id,
            name: m.id,
            family: 'lmstudio',
            version: '1.0.0',
            maxInputTokens: 128000,
            maxOutputTokens: config.maxTokens,
            isDefault: index === 0,
            isUserSelectable: true,
            capabilities: {
                toolCalling: true,
            },
        }));
        onModelsChanged.fire();
        return cachedModels;
    }
    const provider = {
        onDidChangeLanguageModelChatInformation: onModelsChanged.event,
        async provideLanguageModelChatInformation(_options, token) {
            if (cachedModels.length === 0) {
                try {
                    return await refreshModels();
                }
                catch {
                    return [{
                            id: 'lmstudio-local',
                            name: 'LM Studio (offline)',
                            family: 'lmstudio',
                            version: '1.0.0',
                            maxInputTokens: 128000,
                            maxOutputTokens: (0, lmStudioClient_1.getConfig)().maxTokens,
                            isDefault: true,
                            isUserSelectable: true,
                            capabilities: {},
                        }];
                }
            }
            return cachedModels;
        },
        async provideLanguageModelChatResponse(model, messages, _options, progress, token) {
            const chatMessages = messages.map((m) => ({
                role: mapRole(m.role),
                content: extractText(m),
            }));
            for await (const chunk of client.streamChatCompletions(chatMessages, { model: model.id === 'lmstudio-local' ? undefined : model.id }, token)) {
                progress.report(new vscode.LanguageModelTextPart(chunk));
            }
        },
        async provideTokenCount(_model, text, _token) {
            const content = typeof text === 'string' ? text : JSON.stringify(text);
            return Math.ceil(content.length / 4);
        },
    };
    disposables.push(vscode.lm.registerLanguageModelChatProvider(VENDOR, provider));
    disposables.push(vscode.commands.registerCommand('autoforge.lmstudio.refreshModels', async () => {
        await refreshModels();
        vscode.window.showInformationMessage('AutoForge: LM Studio models refreshed.');
    }));
}
function mapRole(role) {
    switch (role) {
        case vscode.LanguageModelChatMessageRole.User:
            return 'user';
        case vscode.LanguageModelChatMessageRole.Assistant:
            return 'assistant';
        default:
            return 'system';
    }
}
function extractText(message) {
    return message.content
        .filter((part) => part instanceof vscode.LanguageModelTextPart)
        .map((part) => part.value)
        .join('');
}
//# sourceMappingURL=languageModelProvider.js.map