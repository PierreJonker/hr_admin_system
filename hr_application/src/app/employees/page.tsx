"use client";

import { z } from "zod";
import { api } from "~/trpc/react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Comprehensive Zod Schema for Employee Update
const EmployeeUpdateSchema = z.object({
  id: z.number(),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  telephone: z.string().min(1, { message: "Telephone number is required" }),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  role: z.enum(["Admin", "Manager", "Employee"], { 
    errorMap: () => ({ message: "Role is required" }) 
  }).optional(),
  status: z.enum(["Active", "Inactive"], { 
    errorMap: () => ({ message: "Status is required" }) 
  }).optional(),
  departmentIds: z.array(z.number()).optional(),
});

// Employee Type
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
  const searchParams = useSearchParams();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newRole, setNewRole] = useState<"Admin" | "Manager" | "Employee" | null>(null);
  const [newStatus, setNewStatus] = useState<"Active" | "Inactive" | null>(null);
  const [allDepartments, setAllDepartments] = useState<{ id: number; name: string }[]>([]);
  const [hasShowLoginToast, setHasShowLoginToast] = useState(false);

  const { data, isLoading, error, refetch } = api.user.getAllEmployees.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const fetchDepartments = api.department.getAllDepartments.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const updateEmployee = api.user.updateEmployee.useMutation();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && !hasShowLoginToast) {
      const loginSuccess = searchParams.get("loginSuccess") === "true";

      if (loginSuccess) {
        toast.success("Login successful!");
        setHasShowLoginToast(true);

        setTimeout(() => {
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.delete("loginSuccess");
          router.replace(`/employees?${newSearchParams.toString()}`);
        }, 500);
      }
    }

    if (data) {
      setEmployees(filterEmployees(data));
    }

    if (fetchDepartments.data) {
      setAllDepartments(fetchDepartments.data);
    }
  }, [status, router, searchParams, data, fetchDepartments.data, hasShowLoginToast]);

  const filterEmployees = (allEmployees: Employee[]) => {
    if (!session?.user) return [];
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
          firstName: selectedEmployee.firstName,
          lastName: selectedEmployee.lastName,
          telephone: selectedEmployee.telephone,
        };

        if (session?.user?.role === "Admin") {
          updatePayload.email = selectedEmployee.email;
          updatePayload.role = newRole || selectedEmployee.role;
          updatePayload.status = newStatus || selectedEmployee.status;
          updatePayload.departmentIds = Array.isArray(selectedEmployee.departments)
            ? selectedEmployee.departments.map((dept) => dept.id)
            : [];
        }

        const validatedData = EmployeeUpdateSchema.parse(updatePayload);

        await updateEmployee.mutateAsync(validatedData);
        toast.success("Profile updated successfully!");
        setSelectedEmployee(null);
        await refetch();
      } catch (err) {
        if (err instanceof z.ZodError) {
          err.errors.forEach((error) => toast.error(error.message));
        } else {
          toast.error("Failed to update. Try again.");
        }
      }
    }
  };

  if (status === "loading" || isLoading || fetchDepartments.isLoading) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  if (error || fetchDepartments.error) {
    return (
      <p className="text-center text-red-500">
        Error: {error?.message || fetchDepartments.error?.message}
      </p>
    );
  }

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
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-100">
                <td className="px-4 py-2">{emp.firstName}</td>
                <td className="px-4 py-2">{emp.lastName}</td>
                <td className="px-4 py-2">{emp.email}</td>
                <td className="px-4 py-2">{emp.telephone}</td>
                <td className="px-4 py-2">{emp.manager}</td>
                <td className="px-4 py-2">
                  {Array.isArray(emp.departments)
                    ? emp.departments.map((d) => d.name).join(", ")
                    : emp.departments}
                </td>
                <td className="px-4 py-2">{emp.status}</td>
                <td className="px-4 py-2">{emp.role}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleEdit(emp)}
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
                  value={newRole || selectedEmployee.role}
                  onChange={(e) => setNewRole(e.target.value as "Admin" | "Manager" | "Employee")}
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                </select>

                <label className="block mb-2 mt-2">Status</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={newStatus || selectedEmployee.status}
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
