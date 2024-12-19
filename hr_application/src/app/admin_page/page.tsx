"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "Admin") {
      router.push("/unauthorized"); // Redirect to an unauthorized page
    }
  }, [status, session, router]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Employee" | "Admin" | "Manager">("Employee");
  const [telephone, setTelephone] = useState("");

  const createUser = api.admin_page.createUser.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createUser.mutateAsync({
        firstName,
        lastName,
        email,
        role,
        telephone,
      });
      toast.success("User created successfully!");
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("Employee");
      setTelephone("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create user. Please try again.");
    }
  };

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  return (
    <main className="p-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-6">Admin - User Management</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-md"
      >
        <div className="mb-4">
          <label className="block mb-2 font-medium">First Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">Last Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">Role</label>
          <select
            className="w-full px-3 py-2 border rounded"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "Employee" | "Admin" | "Manager")
            }
          >
            <option value="Employee">Employee</option>
            <option value="Manager">Manager</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">Telephone</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create User
        </button>
      </form>
    </main>
  );
}
