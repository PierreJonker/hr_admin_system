"use client";

import { z } from "zod";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Zod Schema for Employee Update
const EmployeeUpdateSchema = z.object({
  id: z.number(),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  telephone: z.string().min(1, { message: "Telephone number is required" }),
  role: z.enum(["Admin", "Manager", "Employee"], { 
    errorMap: () => ({ message: "Role is required" }) 
  }),
  status: z.enum(["Active", "Inactive"], { 
    errorMap: () => ({ message: "Status is required" }) 
  }),
  departmentIds: z.array(z.number()).optional()
});

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

  const { data, isLoading, error, refetch } = api.user.getAllEmployees.useQuery();
  const fetchDepartments = api.department.getAllDepartments.useQuery();
  const updateEmployee = api.user.updateEmployee.useMutation();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }

    if (status === "authenticated") {
      // Check if login success toast should be shown
      if (localStorage.getItem('loginToast') === 'true') {
        toast.success("Login successful!");
        // Remove the flag to prevent showing toast again
        localStorage.removeItem('loginToast');
      }
    }

    if (data) {
      setEmployees(filterEmployees(data));
    }
    if (fetchDepartments.data) {
      setAllDepartments(fetchDepartments.data);
    }
  }, [status, router, data, fetchDepartments.data]);

  // Filter employees based on role
  const filterEmployees = (allEmployees: Employee[]) => {
    if (!session?.user) return []; // Safely check if session.user exists
    const currentUserId = session.user.id;
  
    if (session.user.role === "Admin") return allEmployees;
  
    return allEmployees.filter((employee) => {
      if (session.user.role === "Manager") {
        return (
          employee.id === Number(currentUserId) ||
          (Array.isArray(employee.departments) &&
            employee.departments.some((dept) =>
              session?.user?.departments?.includes(String(dept.id))
            ))
        );
      }
      return employee.id === Number(currentUserId);
    });
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewRole(employee.role);
    setNewStatus(employee.status);
  };

  const handleSave = async () => {
    if (selectedEmployee) {
      try {
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

        // Validate the payload using Zod
        const validatedData = EmployeeUpdateSchema.parse(updatePayload);

        // Update mutation call
        await updateEmployee.mutateAsync(validatedData);

        // Show success notification
        toast.success("Update successful!");
        setSelectedEmployee(null);

        // Refresh the employee list
        await refetch();
      } catch (err) {
        // Handle Zod validation errors
        if (err instanceof z.ZodError) {
          // Display validation errors
          err.errors.forEach((error) => {
            toast.error(error.message);
        });
        } else {
          // Show generic error notification
          toast.error("Update failed. Please try again.");
        }
      }
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
      <ToastContainer position="top-right" autoClose={3000} />

      <h1 className="text-3xl font-bold mb-6">Employees</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded shadow-md">
          <thead>
            <tr className="bg-blue-500 text-white">
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