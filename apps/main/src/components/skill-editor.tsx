"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/code-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Save, Trash2 } from "lucide-react";
import { FileTree } from "@/components/file-tree";

interface SkillEditorProps {
	skillName: string;
}

export function SkillEditor({ skillName }: SkillEditorProps) {
	const [files, setFiles] = useState<Record<string, string>>({});
	const [selectedFile, setSelectedFile] = useState<string | null>(null);
	const [isDirty, setIsDirty] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [newFilePath, setNewFilePath] = useState("");

	// Load skill data on mount
	useEffect(() => {
		loadSkill();
	}, [skillName]);

	// Warn before leaving with unsaved changes
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault();
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isDirty]);

	const loadSkill = async () => {
		try {
			setIsLoading(true);
			const response = await fetch(`/api/skill/${skillName}`);
			if (!response.ok) throw new Error("Failed to load skill");

			const data = await response.json();
			setFiles(data.files);

			// Select first file by default
			const firstFile = Object.keys(data.files)[0];
			if (firstFile) setSelectedFile(firstFile);
		} catch (error) {
			console.error("Failed to load skill:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleFileSelect = (path: string) => {
		setSelectedFile(path);
	};

	const handleFileChange = (content: string) => {
		if (!selectedFile) return;
		setFiles((prev) => ({ ...prev, [selectedFile]: content }));
		setIsDirty(true);
	};

	const handleAddFile = () => {
		if (!newFilePath.trim()) return;
		const path = newFilePath.trim();

		// Don't allow duplicate files
		if (files[path]) {
			alert("File already exists");
			return;
		}

		setFiles((prev) => ({ ...prev, [path]: "" }));
		setSelectedFile(path);
		setNewFilePath("");
		setIsDirty(true);
	};

	const handleDeleteFile = (path: string) => {
		if (!confirm(`Delete ${path}?`)) return;

		const { [path]: _, ...rest } = files;
		setFiles(rest);

		if (selectedFile === path) {
			setSelectedFile(Object.keys(rest)[0] || null);
		}

		setIsDirty(true);
	};

	const handleSave = async () => {
		try {
			setIsSaving(true);
			const response = await fetch(`/api/skill/${skillName}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ files }),
			});

			if (!response.ok) throw new Error("Failed to save");

			setIsDirty(false);
		} catch (error) {
			console.error("Failed to save:", error);
			alert("Failed to save changes");
		} finally {
			setIsSaving(false);
		}
	};

	const getLanguageFromPath = (path: string): string => {
		const ext = path.split(".").pop()?.toLowerCase();
		const languageMap: Record<string, string> = {
			md: "markdown",
			py: "python",
			js: "javascript",
			ts: "typescript",
			jsx: "javascript",
			tsx: "typescript",
			json: "json",
			sh: "bash",
			yml: "yaml",
			yaml: "yaml",
		};
		return languageMap[ext || ""] || "text";
	};

	// Build file tree structure
	const fileList = Object.keys(files).sort();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="flex h-full">
			{/* File tree sidebar */}
			<div className="w-64 border-r flex flex-col">
				<div className="p-3 border-b">
					<h3 className="font-semibold text-sm">Files</h3>
				</div>

				<ScrollArea className="flex-1">
					<FileTree
						paths={fileList}
						selectedPath={selectedFile}
						onSelect={handleFileSelect}
					/>
				</ScrollArea>

				{/* Add file input */}
				<div className="p-3 border-t space-y-2">
					<div className="flex gap-2">
						<Input
							placeholder="path/to/file.ext"
							value={newFilePath}
							onChange={(e) => setNewFilePath(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAddFile()}
							className="text-sm"
						/>
						<Button size="sm" onClick={handleAddFile}>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Editor */}
			<div className="flex-1 flex flex-col">
				{selectedFile ? (
					<>
						{/* Toolbar */}
						<div className="border-b p-2 flex items-center justify-between">
							<span className="text-sm font-medium">{selectedFile}</span>
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="ghost"
									onClick={() => handleDeleteFile(selectedFile)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
								<Button
									size="sm"
									onClick={handleSave}
									disabled={!isDirty || isSaving}
								>
									<Save className="h-4 w-4 mr-2" />
									{isSaving ? "Saving..." : "Save All"}
								</Button>
							</div>
						</div>

						{/* Content editor */}
						<CodeEditor
							value={files[selectedFile]}
							onChange={handleFileChange}
							language={getLanguageFromPath(selectedFile)}
							height="100%"
							className="flex-1"
							editorClassName="rounded-none border-0"
							placeholder="Enter file content..."
						/>
					</>
				) : (
					<div className="flex items-center justify-center h-full">
						<p className="text-muted-foreground">Select a file to edit</p>
					</div>
				)}
			</div>
		</div>
	);
}
