import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ProjectListItem } from "./project-list-item";
import { getProjectList } from "@/lib/actions";

export async function Sidebar() {
  const projectList = await getProjectList();

  return (
    <aside className="w-64 border-r bg-sidebar flex flex-col h-full shrink-0">
      <div className="p-4">
        <Link href="/create/new">
          <Button className="w-full" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {projectList.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-4 text-center">
              No projects yet
            </p>
          ) : (
            projectList.map((project) => (
              <ProjectListItem key={project.id} project={project} />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
