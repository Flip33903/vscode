/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - VS Code Language Model provider backed by LM Studio
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LMStudioClient, getConfig } from './lmStudioClient';

const VENDOR = 'lmstudio';

export function registerLanguageModelProvider(
	disposables: vscode.Disposable[],
	onModelsChanged: vscode.EventEmitter<void>,
): void {
	const client = new LMStudioClient();
	let cachedModels: vscode.LanguageModelChatInformation[] = [];

	async function refreshModels(): Promise<vscode.LanguageModelChatInformation[]> {
		const config = getConfig();
		const lmModels = await client.listModels();
		cachedModels = lmModels.map((m, index) => ({
			id: m.id,
			name: m.id,
			family: 'lmstudio',
			version: '1.0.0',
			maxInputTokens: 128_000,
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

	const provider: vscode.LanguageModelChatProvider = {
		onDidChangeLanguageModelChatInformation: onModelsChanged.event,

		async provideLanguageModelChatInformation(_options: any, token: any) {
			if (cachedModels.length === 0) {
				try {
					return await refreshModels();
				} catch {
					return [{
						id: 'lmstudio-local',
						name: 'LM Studio (offline)',
						family: 'lmstudio',
						version: '1.0.0',
						maxInputTokens: 128_000,
						maxOutputTokens: getConfig().maxTokens,
						isDefault: true,
						isUserSelectable: true,
						capabilities: {},
					}];
				}
			}
			return cachedModels;
		},

		async provideLanguageModelChatResponse(model: any, messages: any, _options: any, progress: any, token: any) {
			const chatMessages = messages.map((m: any) => ({
				role: mapRole(m.role),
				content: extractText(m),
			}));

			for await (const chunk of client.streamChatCompletions(
				chatMessages,
				{ model: model.id === 'lmstudio-local' ? undefined : model.id },
				token,
			)) {
				progress.report(new vscode.LanguageModelTextPart(chunk));
			}
		},

		async provideTokenCount(_model: any, text: any, _token: any) {
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

function mapRole(role: vscode.LanguageModelChatMessageRole): 'system' | 'user' | 'assistant' | 'tool' {
	switch (role) {
		case vscode.LanguageModelChatMessageRole.User:
			return 'user';
		case vscode.LanguageModelChatMessageRole.Assistant:
			return 'assistant';
		default:
			return 'system';
	}
}

function extractText(message: any): string {
	return message.content
		.filter((part: any): part is vscode.LanguageModelTextPart => part instanceof vscode.LanguageModelTextPart)
		.map((part: any) => part.value)
		.join('');
}