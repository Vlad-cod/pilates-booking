import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRN LAB",
  description: "Pilates Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased" style={{ background: "#1a1814", display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh" }}>
        <div style={{
          width: "100%",
          maxWidth: "390px",
          minHeight: "100vh",
          position: "relative",
          background: "#f0ece6",
          boxShadow: "0 0 80px rgba(0,0,0,0.6)",
          overflowX: "hidden",
        }}>
          {children}
        </div>
      </body>
    </html>
  );
}
