import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans-var",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tailor — we alter to perfection",
  description:
    "Upload your resume and a job posting; get a reworded, structure-preserving PDF. Nothing saved.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full">
        <main className="w-full max-w-[720px] mx-auto px-5 py-14">
          {children}
        </main>
      </body>
    </html>
  );
}
