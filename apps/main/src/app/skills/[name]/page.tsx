"use client";

import { useState, useEffect, use } from "react";
import { updateSkillAction } from "@/app/skills/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeEditor } from "@/components/code-editor";
import { FileTree } from "@/components/file-tree";
import {
	FileText,
	Plus,
	Save,
	ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface SkillEditorPageProps {
	params: Promise<{ name: string }>;
}

export default function SkillEditorPage({ params }: SkillEditorPageProps) {
	const resolvedParams = use(params);
	const skillName = resolvedParams.name;
	const router = useRouter();

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

	// Keyboard shortcut for saving
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if (isDirty) {
					handleSave();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDirty, files]);

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
			toast.error("Failed to load skill");
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
		if (!newFilePath.trim()) {
			toast.error("File path is required");
			return;
		}

		const path = newFilePath.trim();

		// Don't allow duplicate files
		if (files[path]) {
			toast.error("File already exists");
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
			await updateSkillAction(skillName, { files });
			setIsDirty(false);
			toast.success("Saved successfully");
		} catch (error) {
			console.error("Failed to save:", error);
			toast.error("Failed to save changes");
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
			<div className="flex items-center justify-center h-screen">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen">
			{/* Header */}
			<div className="border-b p-4 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push("/skills")}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
					<div>
						<h1 className="text-xl font-bold">{skillName}</h1>
						<p className="text-sm text-muted-foreground">
							{fileList.length} file(s)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{isDirty && (
						<span className="text-sm text-muted-foreground">
							Unsaved changes
						</span>
					)}
					<Button onClick={handleSave} disabled={!isDirty || isSaving}>
						<Save className="h-4 w-4 mr-2" />
						{isSaving ? "Saving..." : "Save All"}
					</Button>
				</div>
			</div>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
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
							onDelete={handleDeleteFile}
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
							{/* File path */}
							<div className="border-b px-4 py-2 bg-muted/50">
								<span className="text-sm font-medium">{selectedFile}</span>
							</div>

							{/* Code editor */}
							<div className="flex-1 overflow-auto p-4">
								<CodeEditor
									value={files[selectedFile]}
									onChange={handleFileChange}
									language={getLanguageFromPath(selectedFile)}
									minHeight="100%"
									className="h-full"
								/>
							</div>
						</>
					) : (
						<div className="flex items-center justify-center h-full">
							<div className="text-center">
								<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">Select a file to edit</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
