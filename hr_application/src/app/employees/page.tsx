"use client";

import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Define Employee Type
type Employee = {
  id: number;
  firstName: string; // Corrected field name
  lastName: string;  // Corrected field name
  email: string;
  role: string;
  status: string;
};

export default function EmployeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Fetch employees using tRPC
  const { data, isLoading, error } = api.user.getAllEmployees.useQuery();

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (data) {
      setEmployees(data);
    }
  }, [status, router, data]);

  // Show loading state
  if (isLoading) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  // Show error state
  if (error) {
    return <p className="text-center text-red-500 mt-10">Failed to load employees: {error.message}</p>;
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Employees</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded shadow-md">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2 text-left">First Name</th>
              <th className="px-4 py-2 text-left">Last Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-100">
                  <td className="px-4 py-2">{employee.firstName || "-"}</td>
                  <td className="px-4 py-2">{employee.lastName || "-"}</td>
                  <td className="px-4 py-2">{employee.email || "-"}</td>
                  <td className="px-4 py-2">{employee.role || "-"}</td>
                  <td className="px-4 py-2">{employee.status || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
