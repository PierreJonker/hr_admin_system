import "~/styles/globals.css";
import Navbar from "./_components/Navbar";
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">

      <body className="bg-gray-100">< main className="flex flex-col min-h-screen bg-gray-100">
            <Navbar />{children}</main></body>
    </html>
  );
}
