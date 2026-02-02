"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Trash2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Skill {
	id: string;
	name: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

export default function SkillsPage() {
	const router = useRouter();
	const [skills, setSkills] = useState<Skill[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newSkillName, setNewSkillName] = useState("");
	const [newSkillDescription, setNewSkillDescription] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	useEffect(() => {
		loadSkills();
	}, []);

	const loadSkills = async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/skill");
			if (!response.ok) throw new Error("Failed to load skills");

			const data = await response.json();
			setSkills(data.skills);
		} catch (error) {
			console.error("Failed to load skills:", error);
			toast.error("Failed to load skills");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateSkill = async () => {
		if (!newSkillName.trim()) {
			toast.error("Skill name is required");
			return;
		}

		// Validate name format
		if (!/^[a-z0-9-]+$/.test(newSkillName)) {
			toast.error(
				"Skill name must be lowercase alphanumeric with hyphens only",
			);
			return;
		}

		try {
			setIsCreating(true);
			const response = await fetch("/api/skill", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: newSkillName,
					description: newSkillDescription || undefined,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to create skill");
			}

			toast.success("Skill created successfully");
			setIsCreateOpen(false);
			setNewSkillName("");
			setNewSkillDescription("");
			loadSkills();
		} catch (error) {
			console.error("Failed to create skill:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to create skill",
			);
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteSkill = async (skillName: string) => {
		if (!confirm(`Delete skill "${skillName}"? This cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch(`/api/skill/${skillName}`, {
				method: "DELETE",
			});

			if (!response.ok) throw new Error("Failed to delete skill");

			toast.success("Skill deleted successfully");
			loadSkills();
		} catch (error) {
			console.error("Failed to delete skill:", error);
			toast.error("Failed to delete skill");
		}
	};

	const handleEditSkill = (skillName: string) => {
		router.push(`/skills/${skillName}`);
	};

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-center h-64">
					<p className="text-muted-foreground">Loading skills...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-3xl font-bold">Skills</h1>
					<p className="text-muted-foreground mt-1">
						Reusable code modules for your agents
					</p>
				</div>

				<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							New Skill
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create New Skill</DialogTitle>
							<DialogDescription>
								Create a new skill with files that can be used by your agents.
								Skill names must be lowercase with hyphens (e.g., git-helper).
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="skill-name">Name *</Label>
								<Input
									id="skill-name"
									placeholder="git-helper"
									value={newSkillName}
									onChange={(e) => setNewSkillName(e.target.value)}
									pattern="[a-z0-9-]+"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="skill-description">Description</Label>
								<Textarea
									id="skill-description"
									placeholder="Helper functions for Git operations"
									value={newSkillDescription}
									onChange={(e) => setNewSkillDescription(e.target.value)}
									rows={3}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setIsCreateOpen(false)}
								disabled={isCreating}
							>
								Cancel
							</Button>
							<Button onClick={handleCreateSkill} disabled={isCreating}>
								{isCreating ? "Creating..." : "Create Skill"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{skills.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<FileText className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-semibold mb-2">No skills yet</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Create your first skill to get started
						</p>
						<Button onClick={() => setIsCreateOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Create Skill
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{skills.map((skill) => (
						<Card key={skill.id} className="hover:shadow-lg transition-shadow">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									{skill.name}
								</CardTitle>
								<CardDescription>
									{skill.description || "No description"}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex justify-end gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleEditSkill(skill.name)}
									>
										<Edit className="h-4 w-4 mr-2" />
										Edit
									</Button>
									<Button
										size="sm"
										variant="destructive"
										onClick={() => handleDeleteSkill(skill.name)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
