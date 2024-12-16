import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
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
        manager: employee.manager
          ? `${employee.manager.firstName} ${employee.manager.lastName}`
          : "N/A",
        telephone: employee.telephone || "N/A",
        departments: employee.departments.map((d) => d.name).join(", ") || "N/A",
      };
    }),

  // Update employee telephone
  updateEmployee: protectedProcedure
    .input(
      z.object({
        id: z.number(), // ID of the employee
        telephone: z.string().optional(), // Updated telephone number
      })
    )
    .mutation(async ({ input }) => {
      const { id, telephone } = input;

      // Update the employee in the database
      const updatedEmployee = await db.user.update({
        where: { id },
        data: { telephone },
        select: {
          id: true,
          telephone: true,
        },
      });

      return updatedEmployee;
    }),
});
