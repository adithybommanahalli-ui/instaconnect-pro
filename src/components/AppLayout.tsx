import { ReactNode, useState } from "react";
import { Sidebar, MobileNav } from "./Sidebar";
import { CreatePostDialog } from "./CreatePostDialog";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="min-h-screen flex w-full">
      <Sidebar onCreate={() => setCreateOpen(true)} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav onCreate={() => setCreateOpen(true)} />
      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};
