"use client";

import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Define Employee Type
type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  telephone: string;
  manager: string | "N/A";
  departments: string;
};

export default function EmployeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const { data, isLoading, error } = api.user.getAllEmployees.useQuery();
  const updateEmployee = api.user.updateEmployee.useMutation();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (data) {
      setEmployees(data);
    }
  }, [status, router, data]);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const handleSave = async () => {
    if (selectedEmployee) {
      await updateEmployee.mutateAsync({
        id: selectedEmployee.id,
        telephone: selectedEmployee.telephone,
      });
      setSelectedEmployee(null);
    }
  };

  if (isLoading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center text-red-500">Error: {error.message}</p>;

  console.log("Session User:", session?.user); // Debug to check session.user fields

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
              <th className="px-4 py-2 text-left">Telephone</th>
              <th className="px-4 py-2 text-left">Manager</th>
              <th className="px-4 py-2 text-left">Departments</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-100">
                <td className="px-4 py-2">{employee.firstName}</td>
                <td className="px-4 py-2">{employee.lastName}</td>
                <td className="px-4 py-2">{employee.email}</td>
                <td className="px-4 py-2">{employee.telephone}</td>
                <td className="px-4 py-2">{employee.manager}</td>
                <td className="px-4 py-2">{employee.departments}</td>
                <td className="px-4 py-2">{employee.status}</td>
                <td className="px-4 py-2">{employee.role}</td>
                <td className="px-4 py-2">
                  {session?.user?.id &&
                  (session.user.role === "Admin" ||
                    (session.user.role === "Manager" &&
                      employee.manager === `${session.user.firstname} ${session.user.lastname}`) ||
                    session.user.id === String(employee.id)) ? (
                    <button
                      onClick={() => handleEdit(employee)}
                      className="bg-blue-500 text-white px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-xl font-bold mb-4">Edit Employee</h2>
            <label className="block mb-2">Telephone</label>
            <input
              className="w-full px-3 py-2 border rounded"
              value={selectedEmployee.telephone}
              onChange={(e) =>
                setSelectedEmployee({ ...selectedEmployee, telephone: e.target.value })
              }
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="mr-2 bg-gray-300 px-3 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
