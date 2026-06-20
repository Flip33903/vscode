"use strict";
/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - LM Studio API client (OpenAI-compatible)
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
exports.LMStudioClient = void 0;
exports.getConfig = getConfig;
const vscode = __importStar(require("vscode"));
function getConfig() {
    const config = vscode.workspace.getConfiguration('autoforge.lmstudio');
    return {
        baseUrl: config.get('baseUrl', 'http://localhost:1234/v1').replace(/\/$/, ''),
        apiKey: config.get('apiKey', ''),
        chatModel: config.get('chatModel', ''),
        completionModel: config.get('completionModel', ''),
        temperature: config.get('temperature', 0.2),
        maxTokens: config.get('maxTokens', 2048),
    };
}
class LMStudioClient {
    constructor(config = getConfig()) {
        this.config = config;
    }
    headers() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        return headers;
    }
    async listModels(token) {
        const response = await fetch(`${this.config.baseUrl}/models`, {
            method: 'GET',
            headers: this.headers(),
            signal: token?.isCancellationRequested ? AbortSignal.abort() : undefined,
        });
        if (!response.ok) {
            throw new Error(`LM Studio /models failed: ${response.status} ${response.statusText}`);
        }
        const body = await response.json();
        return body.data ?? [];
    }
    async resolveModel(preferred, token) {
        if (preferred) {
            return preferred;
        }
        const models = await this.listModels(token);
        if (models.length === 0) {
            throw new Error('No models loaded in LM Studio. Load a model and start the local server.');
        }
        return models[0].id;
    }
    async *streamChatCompletions(messages, options = {}, token) {
        const model = await this.resolveModel(options.model ?? this.config.chatModel, token);
        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                model,
                messages,
                temperature: options.temperature ?? this.config.temperature,
                max_tokens: options.maxTokens ?? this.config.maxTokens,
                stream: true,
            }),
            signal: token?.isCancellationRequested ? AbortSignal.abort() : undefined,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`LM Studio chat failed: ${response.status} ${text}`);
        }
        if (!response.body) {
            throw new Error('LM Studio returned an empty response body');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                if (token?.isCancellationRequested) {
                    await reader.cancel();
                    break;
                }
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) {
                        continue;
                    }
                    const payload = trimmed.slice(5).trim();
                    if (payload === '[DONE]') {
                        return;
                    }
                    try {
                        const json = JSON.parse(payload);
                        const chunk = json.choices?.[0]?.delta?.content;
                        if (chunk) {
                            yield chunk;
                        }
                    }
                    catch {
                        // ignore malformed SSE chunks
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    async complete(prompt, options = {}, token) {
        const model = await this.resolveModel(options.model ?? this.config.completionModel ?? this.config.chatModel, token);
        const response = await fetch(`${this.config.baseUrl}/completions`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                model,
                prompt,
                temperature: options.temperature ?? this.config.temperature,
                max_tokens: Math.min(options.maxTokens ?? 256, 512),
                stop: options.stop,
                stream: false,
            }),
            signal: token?.isCancellationRequested ? AbortSignal.abort() : undefined,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`LM Studio completion failed: ${response.status} ${text}`);
        }
        const body = await response.json();
        return body.choices?.[0]?.text ?? '';
    }
    async testConnection(token) {
        try {
            const models = await this.listModels(token);
            return {
                ok: true,
                models: models.map(m => m.id),
                message: models.length
                    ? `Connected. ${models.length} model(s) available.`
                    : 'Connected, but no models are loaded.',
            };
        }
        catch (err) {
            return {
                ok: false,
                models: [],
                message: err instanceof Error ? err.message : String(err),
            };
        }
    }
}
exports.LMStudioClient = LMStudioClient;
//# sourceMappingURL=lmStudioClient.js.map