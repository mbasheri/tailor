import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b bg-bg/85 backdrop-blur">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-md bg-accent text-[#04121f] font-bold text-sm">
            R
          </span>
          <span className="font-semibold tracking-tight">Runway</span>
          <span className="text-text-dim text-sm hidden sm:inline">
            · resume tailor
          </span>
        </Link>
      </div>
    </header>
  );
}
