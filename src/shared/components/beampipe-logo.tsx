import { cn } from "@/shared/lib/cn";

export function BeampipeLogo({
  alt = "Beampipe",
  className,
}: {
  alt?: string;
  className?: string;
}) {
  return (
    <img
      alt={alt}
      className={cn("block h-auto w-auto", className)}
      src="/brand/beampipe-terminal-logo.svg"
    />
  );
}
