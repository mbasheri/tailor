import { TailourApp } from "@/components/TailourApp";

export default function Home() {
  return (
    <div>
      <header className="text-center mb-16">
        <h1 className="text-5xl sm:text-6xl font-medium tracking-tight lowercase">
          tailour
        </h1>
        <p className="text-muted text-base mt-3">we alter, you apply</p>
      </header>

      <TailourApp />

      <p className="text-muted text-xs text-center mt-16 max-w-sm mx-auto leading-relaxed">
        tailour does not store or save any of your information. nothing is
        retained after you close this page.
      </p>
    </div>
  );
}
