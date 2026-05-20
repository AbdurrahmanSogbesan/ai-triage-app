import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 28, className }: Props) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M3 14h3l2.5-7L12 17l3-7 2 4h4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
