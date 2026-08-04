import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans-var",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tailour — we alter, you apply",
  description:
    "upload your resume and a job posting; get a reworded resume with your formatting kept exactly. nothing saved.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <main className="w-full max-w-[680px] mx-auto px-5 py-16 sm:py-20">
          {children}
        </main>
      </body>
    </html>
  );
}
