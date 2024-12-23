"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Modal from "react-modal";
import { ChevronDown, ChevronUp, Search, UserPlus, Building } from "lucide-react";

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
  managerIds: number[];
  managerNames: string;
  users: string;
}

interface ModalActions {
  confirm: () => void;
  cancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

Modal.setAppElement("body");

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State management
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmMessage, setConfirmMessage] = useState("");
  const [modalActions, setModalActions] = useState<ModalActions>({
    confirm: () => {},
    cancel: () => closeModal(),
    confirmText: "Yes",
    cancelText: "No"
  });

  // UI state
  const [isUsersVisible, setIsUsersVisible] = useState(true);
  const [isDepartmentsVisible, setIsDepartmentsVisible] = useState(true);
  const [isUserFormVisible, setIsUserFormVisible] = useState(false);
  const [isDepartmentFormVisible, setIsDepartmentFormVisible] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Employee" | "Admin" | "Manager">("Employee");
  const [telephone, setTelephone] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const [departmentName, setDepartmentName] = useState("");
  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableManagers, setAvailableManagers] = useState<Array<{ id: number; name: string }>>([]);

  // API hooks
  const createUser = api.admin_page.createUser.useMutation();
  const fetchUsers = api.admin_page.getAllUsers.useQuery();
  const deleteUser = api.admin_page.deleteUser.useMutation();
  const createDepartment = api.admin_page.createDepartment.useMutation();
  const updateDepartment = api.admin_page.updateDepartment.useMutation();
  const fetchDepartments = api.admin_page.getAllDepartments.useQuery();
  const deleteDepartment = api.admin_page.deleteDepartment.useMutation();
  const fetchManagers = api.admin_page.fetchManagers.useQuery();

  // Authorization check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "Admin") {
      router.push("/unauthorized");
    }
  }, [status, session, router]);

  // Data fetching
  useEffect(() => {
    if (fetchUsers.data) {
      setUsers(fetchUsers.data.map(user => ({
        ...user,
        role: user.role as "Employee" | "Admin" | "Manager",
        telephone: user.telephone ?? undefined,
      })));
    }
    if (fetchDepartments.data) {
      setDepartments(fetchDepartments.data);
    }
    if (fetchManagers.data) {
      setAvailableManagers(fetchManagers.data);
    }
  }, [fetchUsers.data, fetchDepartments.data, fetchManagers.data]);

  // Search functionality
  const filteredUsers = users.filter(user => {
    const searchTerm = userSearch.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchTerm) ||
      user.lastName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.departments.toLowerCase().includes(searchTerm) ||
      user.role.toLowerCase().includes(searchTerm)
    );
  });

  // Modal handlers
  const openModal = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setModalIsOpen(true);
  };

  const closeModal = () => setModalIsOpen(false);

  // Form handlers
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
      setIsUserFormVisible(false);
      await fetchUsers.refetch();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create user. Please try again.");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    openModal(`Are you sure you want to delete ${user?.firstName} ${user?.lastName}?`, async () => {});

    setModalActions({
      confirm: async () => {
        try {
          await deleteUser.mutateAsync({ userId });
          toast.success("User deleted successfully!");
          await fetchUsers.refetch();
          closeModal();
        } catch (error) {
          console.error(error);
          toast.error("Failed to delete user. Please try again.");
        }
      },
      cancel: () => closeModal(),
      confirmText: "Yes, Delete User",
      cancelText: "Cancel"
    });
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && selectedDepartment) {
        // Find managers being removed
        const removedManagerIds = selectedDepartment.managerIds.filter(
          id => !selectedManagerIds.includes(id)
        );
        
        if (removedManagerIds.length > 0) {
          const removedManager = availableManagers.find(
            manager => removedManagerIds.includes(manager.id)
          );

          if (removedManager) {
            openModal(
              `Do you want to remove ${removedManager.name} as an employee from the department as well?`,
              async () => {}
            );

            setModalActions({
              confirm: async () => {
                await updateDepartment.mutateAsync({
                  id: selectedDepartment.id,
                  name: departmentName,
                  managerIds: selectedManagerIds,
                  removeFromDepartment: [removedManager.id],
                });
                toast.success("Manager removed from department completely");
                closeModal();
                setDepartmentName("");
                setSelectedManagerIds([]);
                setIsDepartmentFormVisible(false);
                setIsEditMode(false);
                setSelectedDepartment(null);
                await fetchDepartments.refetch();
              },
              cancel: async () => {
                await updateDepartment.mutateAsync({
                  id: selectedDepartment.id,
                  name: departmentName,
                  managerIds: selectedManagerIds,
                  removeFromDepartment: [],
                });
                toast.success("Manager role removed but kept as employee");
                closeModal();
                setDepartmentName("");
                setSelectedManagerIds([]);
                setIsDepartmentFormVisible(false);
                setIsEditMode(false);
                setSelectedDepartment(null);
                await fetchDepartments.refetch();
              },
              confirmText: "Yes, Remove Completely",
              cancelText: "No, Keep as Employee"
            });
            return; // Exit early as modal will handle the update
          }
        }

        // No managers removed or no confirmation needed, proceed with update
        await updateDepartment.mutateAsync({
          id: selectedDepartment.id,
          name: departmentName,
          managerIds: selectedManagerIds,
          removeFromDepartment: [],
        });
        toast.success("Department updated successfully!");
      } else {
        await createDepartment.mutateAsync({
          name: departmentName,
          managerIds: selectedManagerIds,
        });
        toast.success("Department created successfully!");
      }
      
      setDepartmentName("");
      setSelectedManagerIds([]);
      setIsDepartmentFormVisible(false);
      setIsEditMode(false);
      setSelectedDepartment(null);
      await fetchDepartments.refetch();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} department. Please try again.`);
    }
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    const department = departments.find(d => d.id === departmentId);
    openModal(`Are you sure you want to delete the department "${department?.name}"?`, async () => {});

    setModalActions({
      confirm: async () => {
        try {
          await deleteDepartment.mutateAsync({ departmentId });
          toast.success("Department deleted successfully!");
          await fetchDepartments.refetch();
          closeModal();
        } catch (error) {
          console.error(error);
          toast.error("Failed to delete department. Please try again.");
        }
      },
      cancel: () => closeModal(),
      confirmText: "Yes, Delete Department",
      cancelText: "Cancel"
    });
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setDepartmentName(department.name);
    setSelectedManagerIds(department.managerIds);
    setIsEditMode(true);
    setIsDepartmentFormVisible(true);
  };

  const handleUpdateDepartmentManagers = async (departmentId: number, newManagerIds: number[]) => {
    try {
      const department = departments.find(d => d.id === departmentId);
      if (!department) return;

      const removedManagerIds = department.managerIds.filter(id => !newManagerIds.includes(id));
      const removedManager = availableManagers.find(manager => removedManagerIds.includes(manager.id));

      if (removedManager) {
        openModal(
          `Do you want to remove ${removedManager.name} as an employee from the department as well?`,
          async () => {}
        );

        setModalActions({
          confirm: async () => {
            await updateDepartment.mutateAsync({
              id: departmentId,
              name: department.name,
              managerIds: newManagerIds,
              removeFromDepartment: [removedManager.id],
            });
            toast.success("Manager removed from department completely");
            closeModal();
            await fetchDepartments.refetch();
          },
          cancel: async () => {
            await updateDepartment.mutateAsync({
              id: departmentId,
              name: department.name,
              managerIds: newManagerIds,
              removeFromDepartment: [],
            });
            toast.success("Manager role removed but kept as employee");
            closeModal();
            await fetchDepartments.refetch();
          },
          confirmText: "Yes, Remove Completely",
          cancelText: "No, Keep as Employee"
        });
      } else {
        await updateDepartment.mutateAsync({
          id: departmentId,
          name: department.name,
          managerIds: newManagerIds,
          removeFromDepartment: [],
        });
        toast.success("Department managers updated successfully!");
        await fetchDepartments.refetch();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update department managers. Please try again.");
    }
  };

  if (status === "loading") {
    return <p className="text-center mt-10">Loading...</p>;
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Confirmation Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Confirmation"
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded shadow-lg max-w-lg p-6 z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
      >
        <div>
          <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
          <p className="mb-4">{confirmMessage}</p>
          <div className="flex justify-end space-x-4">
            <button
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              onClick={modalActions.cancel}
            >
              {modalActions.cancelText || "Cancel"}
            </button>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              onClick={modalActions.confirm}
            >
              {modalActions.confirmText || "Confirm"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedDepartment(null);
              setIsUserFormVisible(!isUserFormVisible);
              setIsDepartmentFormVisible(false);
            }}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            <UserPlus size={20} />
            Add User
          </button>
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedDepartment(null);
              setDepartmentName("");
              setSelectedManagerIds([]);
              setIsDepartmentFormVisible(!isDepartmentFormVisible);
              setIsUserFormVisible(false);
            }}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            <Building size={20} />
            Add Department
          </button>
        </div>
      </div>
{/* User Form */}
{isUserFormVisible && (
        <div className="mb-8 bg-white p-6 rounded shadow-lg">
          <form onSubmit={handleUserSubmit}>
            <h2 className="text-xl font-semibold mb-4">Create New User</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">First Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Last Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Role</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "Employee" | "Admin" | "Manager")}
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block mb-2">Telephone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border rounded"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsUserFormVisible(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Department Form */}
      {isDepartmentFormVisible && (
        <div className="mb-8 bg-white p-6 rounded shadow-lg">
          <form onSubmit={handleDepartmentSubmit}>
            <h2 className="text-xl font-semibold mb-4">
              {isEditMode ? 'Edit Department' : 'Create New Department'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Department Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Department Managers</label>
                <select
                  multiple
                  className="w-full px-3 py-2 border rounded min-h-[100px]"
                  value={selectedManagerIds.map(String)}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
                    setSelectedManagerIds(selectedOptions);
                  }}
                >
                  {availableManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple managers</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsDepartmentFormVisible(false);
                  setIsEditMode(false);
                  setSelectedDepartment(null);
                  setDepartmentName("");
                  setSelectedManagerIds([]);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${isEditMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-2 rounded`}
              >
                {isEditMode ? 'Update Department' : 'Create Department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Section */}
      <div className="mb-8">
        <div 
          className="flex items-center justify-between bg-white p-4 rounded-t cursor-pointer"
          onClick={() => setIsUsersVisible(!isUsersVisible)}
        >
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserPlus size={24} />
            Users
          </h2>
          {isUsersVisible ? <ChevronUp /> : <ChevronDown />}
        </div>
        
        {isUsersVisible && (
          <div className="bg-white rounded-b shadow">
            <div className="p-4 border-t">
              <div className="flex items-center bg-gray-50 p-2 rounded mb-4">
                <Search className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search users by name, email, role, or department..."
                  className="w-full bg-transparent outline-none"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              
              <div className="overflow-x-auto">
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
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.departments}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {user.role !== 'Admin' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Departments Section */}
      <div className="mb-8">
        <div 
          className="flex items-center justify-between bg-white p-4 rounded-t cursor-pointer"
          onClick={() => setIsDepartmentsVisible(!isDepartmentsVisible)}
        >
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building size={24} />
            Departments
          </h2>
          {isDepartmentsVisible ? <ChevronUp /> : <ChevronDown />}
        </div>
        
        {isDepartmentsVisible && (
          <div className="bg-white rounded-b shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Managers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map((department) => (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {department.name}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          multiple
                          className="border rounded px-2 py-1 min-w-[200px]"
                          value={department.managerIds.map(String)}
                          onChange={(e) => {
                            const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
                            handleUpdateDepartmentManagers(department.id, selectedOptions);
                          }}
                        >
                          {availableManagers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-1">Current: {department.managerNames || 'No managers'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {department.users}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-4">
                          <button
                            onClick={() => handleEditDepartment(department)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(department.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}