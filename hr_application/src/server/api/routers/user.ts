import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const userRouter = createTRPCRouter({
  // Fetch all employees
  getAllEmployees: protectedProcedure.query(async () => {
    const employees = await db.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        telephone: true,
        manager: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        departments: {
          select: {
            name: true,
          },
        },
      },
    });

    // Flatten manager's name and departments
    return employees.map((emp) => ({
      ...emp,
      role: emp.role as "Admin" | "Manager" | "Employee",
      status: emp.status as "Active" | "Inactive",
      manager: emp.manager
        ? `${emp.manager.firstName} ${emp.manager.lastName}`
        : "N/A",
      telephone: emp.telephone || "N/A",
      departments: emp.departments.map((d) => d.name).join(", ") || "N/A",
    }));
  }),

  // Fetch employee by ID
  getEmployeeById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const employee = await db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          telephone: true,
          manager: {
            select: { firstName: true, lastName: true },
          },
          departments: {
            select: { name: true },
          },
        },
      });
      if (!employee) throw new Error("Employee not found");

      return {
        ...employee,
        role: employee.role as "Admin" | "Manager" | "Employee",
        status: employee.status as "Active" | "Inactive",
        manager: employee.manager
          ? `${employee.manager.firstName} ${employee.manager.lastName}`
          : "N/A",
        telephone: employee.telephone || "N/A",
        departments: employee.departments.map((d) => d.name).join(", ") || "N/A",
      };
    }),

  // Update employee details (telephone, role, status, firstName, lastName, email, departments)
  updateEmployee: protectedProcedure
    .input(
      z.object({
        id: z.number(), // ID of the employee
        telephone: z.string().optional(), // Updated telephone number
        role: z.enum(["Admin", "Manager", "Employee"]).optional(), // Updated role
        status: z.enum(["Active", "Inactive"]).optional(), // Updated status
        firstName: z.string().optional(), // Updated first name
        lastName: z.string().optional(), // Updated last name
        email: z.string().email().optional(), // Updated email
        departmentIds: z.array(z.number()).optional(), // Updated departments as IDs
      })
    )
    .mutation(async ({ input }) => {
      const { id, departmentIds, ...updates } = input;

      // Update the employee in the database
      const updatedEmployee = await db.user.update({
        where: { id },
        data: {
          ...updates,
          // Update departments by connecting to their IDs
          departments: departmentIds
            ? {
                set: departmentIds.map((deptId) => ({ id: deptId })),
              }
            : undefined,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          telephone: true,
          role: true,
          status: true,
          departments: {
            select: { id: true, name: true },
          },
        },
      });

      return {
        ...updatedEmployee,
        departments: updatedEmployee.departments
          ? updatedEmployee.departments.map((d) => d.name).join(", ")
          : "N/A",
      };
    }),
});
