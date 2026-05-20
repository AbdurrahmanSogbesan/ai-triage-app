import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
};

export function ProfileRow({ label, value, mono = false, className }: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-[140px_1fr] items-center gap-3 py-3 first:pt-0 last:pb-0",
        className
      )}
    >
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-[13.5px] text-foreground",
          mono && "font-mono tabular-nums"
        )}
      >
        {value || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}
