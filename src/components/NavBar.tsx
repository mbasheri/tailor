import Link from "next/link";

export function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur-md">
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent text-white font-bold text-sm">
            L
          </span>
          <span className="font-semibold tracking-tight text-[1.05rem]">
            Lyze
          </span>
          <span className="text-text-dim text-sm hidden sm:inline">
            · resume tailor
          </span>
        </Link>
      </div>
    </header>
  );
}
