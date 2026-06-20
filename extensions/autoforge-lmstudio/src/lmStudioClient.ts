/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - LM Studio API client (OpenAI-compatible)
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface LMStudioModel {
	id: string;
	object?: string;
	owned_by?: string;
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
}

export interface LMStudioConfig {
	baseUrl: string;
	apiKey: string;
	chatModel: string;
	completionModel: string;
	temperature: number;
	maxTokens: number;
}

export function getConfig(): LMStudioConfig {
	const config = vscode.workspace.getConfiguration('autoforge.lmstudio');
	return {
		baseUrl: config.get<string>('baseUrl', 'http://localhost:1234/v1').replace(/\/$/, ''),
		apiKey: config.get<string>('apiKey', ''),
		chatModel: config.get<string>('chatModel', ''),
		completionModel: config.get<string>('completionModel', ''),
		temperature: config.get<number>('temperature', 0.2),
		maxTokens: config.get<number>('maxTokens', 2048),
	};
}

export class LMStudioClient {
	constructor(private readonly config: LMStudioConfig = getConfig()) { }

	private headers(): Record<string, string> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (this.config.apiKey) {
			headers['Authorization'] = `Bearer ${this.config.apiKey}`;
		}
		return headers;
	}

	async listModels(token?: vscode.CancellationToken): Promise<LMStudioModel[]> {
		const response = await fetch(`${this.config.baseUrl}/models`, {
			method: 'GET',
			headers: this.headers(),
			signal: token?.isCancellationRequested ? AbortSignal.abort() : undefined,
		});
		if (!response.ok) {
			throw new Error(`LM Studio /models failed: ${response.status} ${response.statusText}`);
		}
		const body = await response.json() as { data?: LMStudioModel[] };
		return body.data ?? [];
	}

	async resolveModel(preferred: string, token?: vscode.CancellationToken): Promise<string> {
		if (preferred) {
			return preferred;
		}
		const models = await this.listModels(token);
		if (models.length === 0) {
			throw new Error('No models loaded in LM Studio. Load a model and start the local server.');
		}
		return models[0].id;
	}

	async *streamChatCompletions(
		messages: ChatMessage[],
		options: { model?: string; temperature?: number; maxTokens?: number } = {},
		token?: vscode.CancellationToken,
	): AsyncGenerator<string> {
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
						const json = JSON.parse(payload) as {
							choices?: Array<{ delta?: { content?: string } }>;
						};
						const chunk = json.choices?.[0]?.delta?.content;
						if (chunk) {
							yield chunk;
						}
					} catch {
						// ignore malformed SSE chunks
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	async complete(
		prompt: string,
		options: { model?: string; temperature?: number; maxTokens?: number; stop?: string[] } = {},
		token?: vscode.CancellationToken,
	): Promise<string> {
		const model = await this.resolveModel(
			options.model ?? this.config.completionModel ?? this.config.chatModel,
			token,
		);
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

		const body = await response.json() as {
			choices?: Array<{ text?: string }>;
		};
		return body.choices?.[0]?.text ?? '';
	}

	async testConnection(token?: vscode.CancellationToken): Promise<{ ok: boolean; models: string[]; message: string }> {
		try {
			const models = await this.listModels(token);
			return {
				ok: true,
				models: models.map(m => m.id),
				message: models.length
					? `Connected. ${models.length} model(s) available.`
					: 'Connected, but no models are loaded.',
			};
		} catch (err) {
			return {
				ok: false,
				models: [],
				message: err instanceof Error ? err.message : String(err),
			};
		}
	}
}
