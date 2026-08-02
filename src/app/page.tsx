import { TailorApp } from "@/components/TailorApp";

export default function Home() {
  return (
    <div>
      <header className="text-center mb-12">
        <h1 className="text-brown text-6xl font-bold tracking-tight">Tailor</h1>
        <p className="text-brown-soft text-lg mt-3">we alter to perfection</p>
      </header>

      <TailorApp />

      <p className="text-text-dim text-sm text-center mt-14 max-w-md mx-auto leading-relaxed">
        Tailor does not store or save any of your information. Nothing is
        retained after you close this page.
      </p>
    </div>
  );
}
