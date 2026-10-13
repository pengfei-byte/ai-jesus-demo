"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { transitionTo } from "@/lib/stage-nav";

export function StageLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function click(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    transitionTo(() => router.push(href));
  }

  return (
    <Link className={className} href={href} onClick={click}>
      {children}
    </Link>
  );
}
