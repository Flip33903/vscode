/*---------------------------------------------------------------------------------------------
 *  AutoForge Code - Chat participant / agent backed by LM Studio
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LMStudioClient } from './lmStudioClient';

const SYSTEM_PROMPT = `You are AutoForge Agent, a local coding assistant running inside a VS Code fork.
You help with reading, writing, and refactoring code. Prefer concise, actionable answers.
When suggesting edits, use markdown code blocks with language tags.`;

export function registerChatParticipant(disposables: vscode.Disposable[]): void {
	const client = new LMStudioClient();

	const participant = vscode.chat.createChatParticipant('autoforge.agent', async (request, _context, stream, token) => {
		const editor = vscode.window.activeTextEditor;
		const selection = editor?.document.getText(editor.selection);
		const activeFile = editor?.document.uri.fsPath;

		let userPrompt = request.prompt;
		if (request.command === 'explain') {
			userPrompt = selection
				? `Explain this code:\n\n\`\`\`\n${selection}\n\`\`\``
				: `Explain the active file${activeFile ? ` (${activeFile})` : ''}.`;
		} else if (request.command === 'fix') {
			userPrompt = selection
				? `Find and fix issues in this code. Return the corrected code:\n\n\`\`\`\n${selection}\n\`\`\``
				: `Review and fix issues in the active file${activeFile ? ` (${activeFile})` : ''}.`;
		}

		const messages = [
			{ role: 'system' as const, content: SYSTEM_PROMPT },
			{ role: 'user' as const, content: userPrompt },
		];

		for await (const chunk of client.streamChatCompletions(messages, {}, token)) {
			stream.markdown(chunk);
		}
	});

	participant.iconPath = new vscode.ThemeIcon('sparkle');
	disposables.push(participant);
}
