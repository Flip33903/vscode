/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - LM Studio integration entry point
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LMStudioClient } from './lmStudioClient';
import { registerChatParticipant } from './chatParticipant';
import { registerInlineCompletionProvider } from './inlineCompletionProvider';
import { registerLanguageModelProvider } from './languageModelProvider';

export function activate(context: vscode.ExtensionContext): void {
	const disposables: vscode.Disposable[] = [];
	const onModelsChanged = new vscode.EventEmitter<void>();
	disposables.push(onModelsChanged);

	registerLanguageModelProvider(disposables, onModelsChanged);
	registerInlineCompletionProvider(disposables);
	registerChatParticipant(disposables);

	disposables.push(vscode.commands.registerCommand('autoforge.lmstudio.testConnection', async () => {
		const client = new LMStudioClient();
		const result = await client.testConnection();
		if (result.ok) {
			vscode.window.showInformationMessage(`AutoForge: ${result.message}`);
		} else {
			vscode.window.showErrorMessage(`AutoForge: ${result.message}`);
		}
	}));

	context.subscriptions.push(...disposables);
}

export function deactivate(): void {
	// subscriptions disposed automatically
}
