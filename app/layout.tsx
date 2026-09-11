import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synthetic Knowledge",
  description: "Tests utilisateurs synthétiques et A/B sur prototypes",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <header className="shell nav">
          <Link href="/" className="brand">
            <span className="brand-mark">SK</span>
            Synthetic Knowledge
          </Link>
          <Link className="button secondary" href="/studies/new">Nouvelle étude</Link>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
