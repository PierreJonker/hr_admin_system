"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Modal from "react-modal";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "Employee" | "Admin" | "Manager";
  status: string;
  telephone?: string;
  departments: string;
}

interface Department {
  id: number;
  name: string;
  managerId: number | null;
  users: string;
}

Modal.setAppElement("body"); // Ensure proper Modal setup

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "Admin") {
      router.push("/unauthorized");
    }
  }, [status, session, router]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Employee" | "Admin" | "Manager">("Employee");
  const [telephone, setTelephone] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const createUser = api.admin_page.createUser.useMutation();
  const fetchUsers = api.admin_page.getAllUsers.useQuery();
  const deleteUser = api.admin_page.deleteUser.useMutation();

  const [departmentName, setDepartmentName] = useState("");
  const [managerId, setManagerId] = useState<number | undefined>(undefined);
  const [availableManagers, setAvailableManagers] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const createDepartment = api.admin_page.createDepartment.useMutation();
  const fetchDepartments = api.admin_page.getAllDepartments.useQuery();
  const deleteDepartment = api.admin_page.deleteDepartment.useMutation();
  const fetchManagers = api.admin_page.fetchManagers.useQuery();

  useEffect(() => {
    if (fetchUsers.data) {
      setUsers(
        fetchUsers.data.map((user) => ({
          ...user,
          role: user.role as "Employee" | "Admin" | "Manager",
          telephone: user.telephone ?? undefined, // Transform null to undefined
        }))
      );
    }
    if (fetchDepartments.data) {
      setDepartments(fetchDepartments.data);
    }
    if (fetchManagers.data) {
      setAvailableManagers(fetchManagers.data);
    }
  }, [fetchUsers.data, fetchDepartments.data, fetchManagers.data]);

  const openModal = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
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
      await fetchUsers.refetch();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create user. Please try again.");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    openModal("Are you sure you want to delete this user?", async () => {
      try {
        await deleteUser.mutateAsync({ userId });
        toast.success("User deleted successfully!");
        await fetchUsers.refetch();
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete user. Please try again.");
      }
    });
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createDepartment.mutateAsync({
        name: departmentName,
        managerId,
      });
      toast.success("Department created successfully!");
      setDepartmentName("");
      setManagerId(undefined);
      await fetchDepartments.refetch();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create department. Please try again.");
    }
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    openModal("Are you sure you want to delete this department?", async () => {
      try {
        await deleteDepartment.mutateAsync({ departmentId });
        toast.success("Department deleted successfully!");
        await fetchDepartments.refetch();
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete department. Please try again.");
      }
    });
  };

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  return (
    <main className="p-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Confirmation"
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded shadow-lg max-w-lg p-6 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
      >
        <div>
          <h2 className="text-xl font-bold mb-4">Confirm</h2>
          <p className="mb-4">{confirmMessage}</p>
          <div className="flex justify-end space-x-4">
            <button
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={() => {
                confirmAction();
                closeModal();
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
      <h1 className="text-3xl font-bold mb-6">Admin - User and Department Management</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* User Creation Form */}
        <form
          onSubmit={handleUserSubmit}
          className="bg-white p-6 rounded shadow-md"
        >
          <h2 className="text-xl font-semibold mb-4">Create User</h2>
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

        {/* Department Creation Form */}
        <form
          onSubmit={handleDepartmentSubmit}
          className="bg-white p-6 rounded shadow-md"
        >
          <h2 className="text-xl font-semibold mb-4">Create Department</h2>
          <div className="mb-4">
            <label className="block mb-2 font-medium">Department Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 font-medium">Assign Manager</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={managerId || ""}
              onChange={(e) => {
                const value = e.target.value;
                setManagerId(value ? parseInt(value, 10) : undefined);
              }}
            >
              <option value="">Select a manager</option>
              {availableManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Create Department
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Users</h2>
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departments</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.departments}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Departments List */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Departments</h2>
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departments.map((department) => (
                <tr key={department.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{department.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{department.users}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteDepartment(department.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
