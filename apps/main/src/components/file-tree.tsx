"use client";

import { useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	FileText,
	Folder,
	FolderOpen,
	Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TreeNode = {
	name: string;
	path: string;
	type: "folder" | "file";
	children: TreeNode[];
};

type BuildNode = {
	name: string;
	path: string;
	type: "folder" | "file";
	children: Map<string, BuildNode>;
};

type FileTreeProps = {
	paths: string[];
	selectedPath?: string | null;
	onSelect: (path: string) => void;
	onDelete?: (path: string) => void;
	className?: string;
};

function buildTree(paths: string[]): { nodes: TreeNode[]; folderPaths: string[] } {
	const root: BuildNode = {
		name: "",
		path: "",
		type: "folder",
		children: new Map(),
	};

	for (const fullPath of paths) {
		const parts = fullPath.split("/").filter(Boolean);
		let current = root;
		let currentPath = "";

		parts.forEach((part, index) => {
			const isFile = index === parts.length - 1;
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const existing = current.children.get(currentPath);

			if (existing) {
				current = existing;
				return;
			}

			const node: BuildNode = {
				name: part,
				path: currentPath,
				type: isFile ? "file" : "folder",
				children: new Map(),
			};

			current.children.set(currentPath, node);
			current = node;
		});
	}

	const folderPaths: string[] = [];

	const toTree = (node: BuildNode): TreeNode[] => {
		const entries = Array.from(node.children.values());
		entries.sort((a, b) => {
			if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
			return a.name.localeCompare(b.name);
		});

		return entries.map((entry) => {
			if (entry.type === "folder") {
				folderPaths.push(entry.path);
			}
			return {
				name: entry.name,
				path: entry.path,
				type: entry.type,
				children: entry.type === "folder" ? toTree(entry) : [],
			};
		});
	};

	return { nodes: toTree(root), folderPaths };
}

export function FileTree({
	paths,
	selectedPath,
	onSelect,
	onDelete,
	className,
}: FileTreeProps) {
	const { nodes, folderPaths } = useMemo(() => buildTree(paths), [paths]);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		() => new Set(folderPaths),
	);

	useEffect(() => {
		setExpandedFolders(new Set(folderPaths));
	}, [folderPaths]);

	const toggleFolder = (path: string) => {
		setExpandedFolders((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	};

	const renderNodes = (treeNodes: TreeNode[], depth: number) =>
		treeNodes.map((node) => {
			if (node.type === "folder") {
				const isOpen = expandedFolders.has(node.path);
				return (
					<div key={node.path}>
						<button
							type="button"
							onClick={() => toggleFolder(node.path)}
							className={cn(
								"w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent",
								isOpen && "bg-accent/40",
							)}
							style={{ paddingLeft: depth * 12 }}
						>
							{isOpen ? (
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							) : (
								<ChevronRight className="h-4 w-4 text-muted-foreground" />
							)}
							{isOpen ? (
								<FolderOpen className="h-4 w-4 text-muted-foreground" />
							) : (
								<Folder className="h-4 w-4 text-muted-foreground" />
							)}
							<span className="truncate">{node.name}</span>
						</button>
						{isOpen && node.children.length > 0 && (
							<div>{renderNodes(node.children, depth + 1)}</div>
						)}
					</div>
				);
			}

			return (
				<div
					key={node.path}
					className={cn(
						"w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent group",
						selectedPath === node.path && "bg-accent",
					)}
					style={{ paddingLeft: depth * 12 + 20 }}
				>
					<button
						type="button"
						onClick={() => onSelect(node.path)}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onSelect(node.path);
							}
						}}
						className="flex items-center gap-2 flex-1 min-w-0 text-left"
					>
						<FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
						<span className="truncate">{node.name}</span>
					</button>
					{onDelete && (
						<button
							type="button"
							onClick={() => onDelete(node.path)}
							className="opacity-0 group-hover:opacity-100 hover:text-destructive"
							aria-label={`Delete ${node.name}`}
						>
							<Trash2 className="h-3 w-3" />
						</button>
					)}
				</div>
			);
		});

	return <div className={cn("p-2", className)}>{renderNodes(nodes, 0)}</div>;
}
