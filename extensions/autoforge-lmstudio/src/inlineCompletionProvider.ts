/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - Inline completion provider via LM Studio /v1/completions
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LMStudioClient, getConfig } from './lmStudioClient';

export function registerInlineCompletionProvider(disposables: vscode.Disposable[]): void {
	const client = new LMStudioClient();

	const provider: vscode.InlineCompletionItemProvider = {
		async provideInlineCompletionItems(document, position, _context, token) {
			const config = vscode.workspace.getConfiguration('autoforge.lmstudio');
			if (!config.get<boolean>('enableInlineCompletions', true)) {
				return undefined;
			}

			const prefixRange = new vscode.Range(
				new vscode.Position(Math.max(0, position.line - 40), 0),
				position,
			);
			const suffixRange = new vscode.Range(
				position,
				new vscode.Position(Math.min(document.lineCount - 1, position.line + 20), Number.MAX_SAFE_INTEGER),
			);

			const prefix = document.getText(prefixRange);
			const suffix = document.getText(suffixRange);

			// FIM-style prompt works well with code models (Qwen Coder, DeepSeek Coder, etc.)
			const prompt = `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`;

			try {
				const completion = await client.complete(prompt, {
					temperature: Math.min(getConfig().temperature, 0.4),
					maxTokens: 128,
					stop: ['\n\n', '<|fim_prefix|>', '<|fim_suffix|>', '<|fim_middle|>'],
				}, token);

				const insertText = completion.trimEnd();
				if (!insertText) {
					return undefined;
				}

				return [new vscode.InlineCompletionItem(insertText, new vscode.Range(position, position))];
			} catch {
				return undefined;
			}
		},
	};

	disposables.push(vscode.languages.registerInlineCompletionItemProvider({ pattern: '**/*' }, provider));
}
