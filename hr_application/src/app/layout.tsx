import "~/styles/globals.css";
import Navbar from "./_components/Navbar";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-gray-100 flex flex-col min-h-screen">
        <SessionProvider>
          <Navbar />
          {/* Content wrapper to center the children */}
          <div className="flex-grow flex items-center justify-center">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
