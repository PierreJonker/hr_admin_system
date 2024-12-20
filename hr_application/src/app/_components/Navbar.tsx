"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession(); // Get the user's session

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login?logout=success" }); // Add query parameter
  };

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          HR Admin System
        </Link>
        <div className="flex space-x-4">
          {session ? (
            // Links for authenticated users
            <>
              <Link href="/employees" className="hover:underline">
                Employees
              </Link>
              {session.user?.role === "Admin" && (
                <Link href="/admin_page" className="hover:underline">
                  Admin Page
                </Link>
              )}
              <Link href="/departments" className="hover:underline">
                Departments
              </Link>
              <button onClick={handleLogout} className="hover:underline">
                Logout
              </button>
            </>
          ) : (
            // Links for unauthenticated users
            <>
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/login" className="hover:underline">
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
