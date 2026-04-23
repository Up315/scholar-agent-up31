import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...props}
    />
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[60%] space-y-2">
          <Skeleton className="h-4 w-32 bg-purple-200" />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
