"use client";

import { z } from "zod";
import { api } from "~/trpc/react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Search, Filter } from "lucide-react";

const EmployeeUpdateSchema = z.object({
  id: z.number(),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  telephone: z.string().min(1, { message: "Telephone number is required" }),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .optional(),
  role: z
    .enum(["Admin", "Manager", "Employee"], {
      errorMap: () => ({ message: "Role is required" }),
    })
    .optional(),
  status: z
    .enum(["Active", "Inactive"], {
      errorMap: () => ({ message: "Status is required" }),
    })
    .optional(),
  departmentIds: z.array(z.number()).optional(),
});

type Department = {
  id: number;
  name: string;
  isManager: boolean;
};

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
  status: "Active" | "Inactive";
  telephone: string;
  departments: Department[];
};

export default function EmployeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newRole, setNewRole] = useState<"Manager" | "Employee" | null>(null);
  const [newStatus, setNewStatus] = useState<"Active" | "Inactive" | null>(null);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

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
    } else {
      if (data) setEmployees(data);
      if (fetchDepartments.data) {
        const transformedDepartments = fetchDepartments.data.map((dept) => ({
          ...dept,
          isManager: false,
        }));
        setAllDepartments(transformedDepartments);
      }
    }
  }, [status, data, fetchDepartments.data, router]);

  const filterEmployees = (): Employee[] => {
    if (!session?.user) return [];

    return employees.filter((employee) => {
      const matchesDepartment =
        departmentFilter === null ||
        employee.departments.some((dept) => dept.id === departmentFilter);

      const matchesStatus =
        !statusFilter ||
        employee.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesSearch =
        employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.telephone.includes(searchQuery);

      return matchesDepartment && matchesStatus && matchesSearch;
    });
  };

  const handleEdit = (employee: Employee) => {
    if (!session?.user) return;

    // Allow admins to edit anyone, and users to edit their own basic info
    if (session.user.role === "Admin" || employee.id === Number(session.user.id)) {
      setSelectedEmployee(employee);
      setNewRole(employee.role === "Admin" ? null : employee.role);
      setNewStatus(employee.status);
    }
  };

  const handleSave = async () => {
    if (!selectedEmployee || !session?.user) return;

    try {
      let updatePayload: any = {
        id: selectedEmployee.id,
        firstName: selectedEmployee.firstName,
        lastName: selectedEmployee.lastName,
        telephone: selectedEmployee.telephone,
      };

      // Admin can update additional fields, except role for admin accounts
      if (session.user.role === "Admin") {
        updatePayload = {
          ...updatePayload,
          email: selectedEmployee.email,
          status: newStatus || selectedEmployee.status,
          departmentIds: selectedEmployee.departments.map((dept) => dept.id),
        };

        // Only add role to payload if editing a non-admin account
        if (selectedEmployee.role !== "Admin") {
          updatePayload.role = newRole || selectedEmployee.role;
        }
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

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or telephone"
            className="pl-10 pr-4 py-3 border rounded w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" />
          <select
            className="border rounded px-4 py-3"
            value={statusFilter || ""}
            onChange={(e) => setStatusFilter(e.target.value || null)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <select
          className="border rounded px-3 py-2"
          value={departmentFilter || ""}
          onChange={(e) => setDepartmentFilter(Number(e.target.value) || null)}
        >
          <option value="">All Departments</option>
          {allDepartments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded shadow-md">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="px-4 py-2 text-left">First Name</th>
              <th className="px-4 py-2 text-left">Last Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Telephone</th>
              <th className="px-4 py-2 text-left">Departments</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filterEmployees().map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-100">
                <td className="px-4 py-2">{emp.firstName}</td>
                <td className="px-4 py-2">{emp.lastName}</td>
                <td className="px-4 py-2">{emp.email}</td>
                <td className="px-4 py-2">{emp.telephone}</td>
                <td className="px-4 py-2">
                  {emp.departments.map((dept, index) => (
                    <span key={dept.id} className="whitespace-nowrap">
                      {dept.name}
                      {dept.isManager && (
                        <span className="ml-1 text-blue-600 font-medium">(Manager)</span>
                      )}
                      {index < emp.departments.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded ${
                    emp.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {emp.status}
                  </span>
                </td>
                <td className="px-4 py-2">{emp.role}</td>
                <td className="px-4 py-2">
                  {session?.user && (session.user.role === "Admin" || emp.id === Number(session.user.id)) && (
                    <button
                      onClick={() => handleEdit(emp)}
                      className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEmployee && session?.user && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-xl font-bold mb-4">Edit Employee</h2>

            {/* Basic info - editable by all users for their own profile */}
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
            {session.user.role === "Admin" && (
              <>
                <label className="block mb-2 mt-2">Email</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={selectedEmployee.email}
                  onChange={(e) =>
                    setSelectedEmployee({ ...selectedEmployee, email: e.target.value })
                  }
                />

                {/* Show role field only when editing non-admin accounts */}
                {selectedEmployee.role !== "Admin" && (
                  <>
                    <label className="block mb-2 mt-2">Role</label>
                    <select
                      className="w-full px-3 py-2 border rounded"
                      value={newRole || selectedEmployee.role}
                      onChange={(e) => setNewRole(e.target.value as "Manager" | "Employee")}
                    >
                      <option value="Manager">Manager</option>
                      <option value="Employee">Employee</option>
                    </select>
                  </>
                )}

                <label className="block mb-2 mt-2">Status</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={newStatus || selectedEmployee.status}
                  onChange={(e) => setNewStatus(e.target.value as "Active" | "Inactive")}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <label className="block mb-2 mt-2">Departments</label>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {allDepartments.map((dept) => (
                    <div key={dept.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id={`dept-${dept.id}`}
                        checked={selectedEmployee.departments.some(d => d.id === dept.id)}
                        onChange={(e) => {
                          const updatedDepartments = e.target.checked
                            ? [...selectedEmployee.departments, { ...dept, isManager: false }]
                            : selectedEmployee.departments.filter(d => d.id !== dept.id);
                          setSelectedEmployee({
                            ...selectedEmployee,
                            departments: updatedDepartments,
                          });
                        }}
                      />
                      <label htmlFor={`dept-${dept.id}`}>{dept.name}</label>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="mr-2 bg-gray-300 px-3 py-1 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
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
