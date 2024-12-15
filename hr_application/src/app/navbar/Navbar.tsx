"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          HR Admin System
        </Link>
        <div className="flex space-x-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/login" className="hover:underline">
            Login
          </Link>
          <Link href="/employees" className="hover:underline">
            Employees
          </Link>
        </div>
      </div>
    </nav>
  );
}
