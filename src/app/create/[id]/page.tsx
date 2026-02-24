import { notFound } from "next/navigation";
import { CreateView } from "@/components/create/create-view";
import { getProject } from "@/lib/actions";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return <CreateView projectId={project.id} generations={project.generations} />;
}
