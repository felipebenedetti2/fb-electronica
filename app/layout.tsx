import "./globals.css";
import Sidebar from "./components/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-100">
        <Sidebar />

        <main className="min-h-screen pl-64">
          {children}
        </main>
      </body>
    </html>
  );
}
