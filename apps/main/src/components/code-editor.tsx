"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	language?: string;
	placeholder?: string;
	className?: string;
	readOnly?: boolean;
	minHeight?: string;
	maxHeight?: string;
}

export function CodeEditor({
	value,
	onChange,
	language = "text",
	placeholder = "Enter text...",
	className,
	readOnly = false,
	minHeight = "200px",
	maxHeight = "none",
}: CodeEditorProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Handle tab key to insert spaces instead of losing focus
	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Tab") {
			e.preventDefault();
			const textarea = e.currentTarget;
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;

			// Insert 2 spaces for tab
			const newValue =
				value.substring(0, start) + "  " + value.substring(end);
			onChange(newValue);

			// Move cursor after inserted spaces
			setTimeout(() => {
				textarea.selectionStart = textarea.selectionEnd = start + 2;
			}, 0);
		}

		// Handle Cmd/Ctrl+S to prevent default browser save
		if ((e.metaKey || e.ctrlKey) && e.key === "s") {
			e.preventDefault();
			// The parent component should handle saving
		}
	};

	// Auto-resize textarea to fit content
	useEffect(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			// Reset height to auto to get the correct scrollHeight
			textarea.style.height = "auto";
			// Set height to scrollHeight (content height)
			const newHeight = Math.max(
				textarea.scrollHeight,
				Number.parseInt(minHeight),
			);
			textarea.style.height = `${newHeight}px`;
		}
	}, [value, minHeight]);

	return (
		<div className={cn("relative", className)}>
			<textarea
				ref={textareaRef}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				readOnly={readOnly}
				spellCheck={false}
				className={cn(
					"w-full rounded-md border bg-background px-3 py-2 text-sm",
					"font-mono resize-none overflow-auto",
					"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
					"disabled:cursor-not-allowed disabled:opacity-50",
					readOnly && "cursor-default",
				)}
				style={{
					minHeight,
					maxHeight,
					lineHeight: "1.5",
					tabSize: 2,
				}}
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
