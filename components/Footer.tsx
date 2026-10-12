"use client";

import { forgetMemory } from "@/lib/memory";

export function Footer() {
  function forget() {
    forgetMemory(window.localStorage);
    window.location.assign("/");
  }

  return (
    <footer className="site-footer">
      <p>An AI portrayal of Jesus. Not a substitute for Scripture, the church, or a pastor.</p>
      <button type="button" onClick={forget}>
        Forget me
      </button>
    </footer>
  );
}
