import Image from "next/image";
import { cn } from "@/shared/lib/cn";

export function BeampipeLogo({
  alt = "Beampipe",
  className,
}: {
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      alt={alt}
      className={cn("block h-auto w-auto", className)}
      height={793}
      src="/brand/beampipe-terminal-logo.svg"
      unoptimized
      width={1983}
    />
  );
}
