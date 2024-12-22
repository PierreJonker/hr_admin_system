"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Search, Filter } from "lucide-react";
import { useSession } from "next-auth/react";

interface Department {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  managers: string;
}

export default function DepartmentsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "Admin";

  // State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  // API hooks
  const { data: departmentsData, refetch } = api.department.getAllDepartments.useQuery();
  const updateStatus = api.department.updateDepartmentStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Department status updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update department status");
    },
  });

  // Update departments when data changes
  useEffect(() => {
    if (departmentsData) {
      setDepartments(
        departmentsData.map((dept) => ({
          ...dept,
          status: dept.status as "Active" | "Inactive",
        }))
      );
    }
  }, [departmentsData]);

  // Handle status toggle
  const handleStatusToggle = async (id: number, currentStatus: "Active" | "Inactive") => {
    if (!isAdmin) {
      toast.error("Only administrators can perform this action");
      return;
    }

    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Filter departments based on search and status
  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch =
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.managers.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || dept.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-8">
      <ToastContainer position="top-right" autoClose={3000} />

      <h1 className="text-3xl font-bold mb-8 text-center">Departments</h1>

      {/* Search and Filter Bar */}
      <div className="flex gap-4 mb-6 max-w-5xl mx-auto">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments or managers..."
              className="pl-10 pr-4 py-3 border rounded w-full text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" />
          <select
            className="border rounded px-4 py-3 text-base"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | "Inactive")}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Departments Table */}
      <div className="flex justify-center">
        <div className="max-w-5xl w-full bg-white rounded overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#4285f4] text-white">
                <th className="px-8 py-4 text-left text-sm font-medium">
                  Department Name
                </th>
                <th className="px-8 py-4 text-left text-sm font-medium">Managers</th>
                <th className="px-8 py-4 text-left text-sm font-medium">Status</th>
                {isAdmin && (
                  <th className="px-8 py-4 text-right text-sm font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDepartments.map((department) => (
                <tr key={department.id} className="hover:bg-gray-50">
                  <td className="px-8 py-4 whitespace-nowrap text-base">
                    {department.name}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-base">
                    {department.managers}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-base">
                    <span
                      className={`px-3 py-1 rounded text-sm font-semibold ${
                        department.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {department.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-8 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleStatusToggle(department.id, department.status)}
                        className="bg-[#4285f4] text-white px-4 py-2 rounded text-base hover:bg-blue-600"
                      >
                        {department.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
