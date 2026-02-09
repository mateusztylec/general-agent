"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { type Extension } from "@codemirror/state";
import { StreamLanguage, indentUnit } from "@codemirror/language";
import { githubDark } from "@uiw/codemirror-theme-github";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	language?: string;
	placeholder?: string;
	className?: string;
	editorClassName?: string;
	readOnly?: boolean;
	height?: string;
	minHeight?: string;
	maxHeight?: string;
	wrap?: boolean;
}

export function CodeEditor({
	value,
	onChange,
	language = "text",
	placeholder = "Enter text...",
	className,
	editorClassName,
	readOnly = false,
	height,
	minHeight = "200px",
	maxHeight = "none",
	wrap = false,
}: CodeEditorProps) {
	const languageExtension = useMemo<Extension | null>(() => {
		switch (language) {
			case "javascript":
				return javascript({ jsx: true });
			case "typescript":
				return javascript({ typescript: true, jsx: true });
			case "json":
				return json();
			case "python":
				return python();
			case "markdown":
				return markdown();
			case "yaml":
				return yaml();
			case "bash":
			case "shell":
			case "sh":
				return StreamLanguage.define(shell);
			default:
				return null;
		}
	}, [language]);

	const extensions = useMemo<Extension[]>(() => {
		const base: Extension[] = [
			indentUnit.of("  "),
			EditorView.theme(
				{
					"&": { fontSize: "0.875rem" },
					".cm-scroller": {
						fontFamily:
							"var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
					},
					".cm-content": { lineHeight: "1.6", padding: "0.75rem 0" },
					".cm-gutters": { paddingRight: "0.5rem" },
				},
				{ dark: true },
			),
		];

		if (wrap) {
			base.push(EditorView.lineWrapping);
		}

		if (languageExtension) {
			base.push(languageExtension);
		}

		return base;
	}, [languageExtension, wrap]);

	return (
		<div className={cn("relative", className)}>
			<CodeMirror
				value={value}
				onChange={(val) => onChange(val)}
				placeholder={placeholder}
				extensions={extensions}
				theme={githubDark}
				height={height}
				minHeight={minHeight}
				maxHeight={maxHeight}
				indentWithTab
				className={cn(
					"w-full rounded-md border bg-background",
					"focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
					readOnly && "cursor-default opacity-80",
					editorClassName,
				)}
				basicSetup
				editable={!readOnly}
				readOnly={readOnly}
			/>

			{/* Language indicator */}
			{language && language !== "text" && (
				<div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
					{language}
				</div>
			)}
		</div>
	);
}

interface CodeEditorFullscreenProps extends CodeEditorProps {
	label?: string;
	description?: string;
	showSaveIndicator?: boolean;
	isDirty?: boolean;
}

/**
 * CodeEditor with label, description, and save indicator
 * Good for forms and property sheets
 */
export function CodeEditorWithLabel({
	label,
	description,
	showSaveIndicator = false,
	isDirty = false,
	...props
}: CodeEditorFullscreenProps) {
	return (
		<div className="space-y-2">
			{label && (
				<div className="flex items-center justify-between">
					<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						{label}
					</label>
					{showSaveIndicator && isDirty && (
						<span className="text-xs text-muted-foreground">Unsaved changes</span>
					)}
				</div>
			)}
			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
			<CodeEditor {...props} />
		</div>
	);
}
