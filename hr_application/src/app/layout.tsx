import "~/styles/globals.css";
import Navbar from "./_components/Navbar";
import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-gray-100 flex flex-col min-h-screen">
        <SessionProvider>
          <TRPCReactProvider>
            <Navbar />
            {/* Content wrapper to center the children */}
            <div className="flex-grow flex items-center justify-center">
              {children}
            </div>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
