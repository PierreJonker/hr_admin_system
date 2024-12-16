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
  role: "Admin" | "Manager" | "Employee";
  status: "Active" | "Inactive";
  telephone: string;
  manager: string | "N/A";
  departments: { id: number; name: string }[] | string;
};

export default function EmployeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newRole, setNewRole] = useState<"Admin" | "Manager" | "Employee">("Employee");
  const [newStatus, setNewStatus] = useState<"Active" | "Inactive">("Active");
  const [allDepartments, setAllDepartments] = useState<{ id: number; name: string }[]>([]);

  const { data, isLoading, error } = api.user.getAllEmployees.useQuery();
  const fetchDepartments = api.department.getAllDepartments.useQuery();
  const updateEmployee = api.user.updateEmployee.useMutation();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (data) {
      setEmployees(data);
    }
    if (fetchDepartments.data) {
      setAllDepartments(fetchDepartments.data);
    }
  }, [status, router, data, fetchDepartments.data]);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewRole(employee.role);
    setNewStatus(employee.status);
  };

  const handleSave = async () => {
    if (selectedEmployee) {
      const updatePayload: any = {
        id: selectedEmployee.id,
        telephone: selectedEmployee.telephone,
        firstName: selectedEmployee.firstName,
        lastName: selectedEmployee.lastName,
      };

      if (session?.user?.role === "Admin") {
        updatePayload.email = selectedEmployee.email;
        updatePayload.role = newRole;
        updatePayload.status = newStatus;
        updatePayload.departmentIds = Array.isArray(selectedEmployee.departments)
          ? selectedEmployee.departments.map((dept) => dept.id)
          : [];
      }

      await updateEmployee.mutateAsync(updatePayload);
      setSelectedEmployee(null);
    }
  };

  if (isLoading || fetchDepartments.isLoading)
    return <p className="text-center mt-10">Loading...</p>;
  if (error || fetchDepartments.error)
    return (
      <p className="text-center text-red-500">
        Error: {error?.message || fetchDepartments.error?.message}
      </p>
    );

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
                <td className="px-4 py-2">
                  {Array.isArray(employee.departments)
                    ? employee.departments.map((d) => d.name).join(", ")
                    : employee.departments}
                </td>
                <td className="px-4 py-2">{employee.status}</td>
                <td className="px-4 py-2">{employee.role}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleEdit(employee)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
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

            {/* Editable for all roles */}
            <label className="block mb-2">First Name</label>
            <input
              className="w-full px-3 py-2 border rounded"
              value={selectedEmployee.firstName}
              onChange={(e) =>
                setSelectedEmployee({ ...selectedEmployee, firstName: e.target.value })
              }
            />

            <label className="block mb-2 mt-2">Last Name</label>
            <input
              className="w-full px-3 py-2 border rounded"
              value={selectedEmployee.lastName}
              onChange={(e) =>
                setSelectedEmployee({ ...selectedEmployee, lastName: e.target.value })
              }
            />

            <label className="block mb-2 mt-2">Telephone</label>
            <input
              className="w-full px-3 py-2 border rounded"
              value={selectedEmployee.telephone}
              onChange={(e) =>
                setSelectedEmployee({ ...selectedEmployee, telephone: e.target.value })
              }
            />

            {/* Admin-only fields */}
            {session?.user?.role === "Admin" && (
              <>
                <label className="block mb-2 mt-2">Email</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={selectedEmployee.email}
                  onChange={(e) =>
                    setSelectedEmployee({ ...selectedEmployee, email: e.target.value })
                  }
                />

                <label className="block mb-2 mt-2">Role</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "Admin" | "Manager" | "Employee")}
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                </select>

                <label className="block mb-2 mt-2">Status</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as "Active" | "Inactive")}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </>
            )}

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
