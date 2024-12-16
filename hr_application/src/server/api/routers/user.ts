import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";

export const userRouter = createTRPCRouter({
  // Fetch all employees
  getAllEmployees: protectedProcedure.query(async () => {
    const employees = await db.user.findMany({
      select: {
        id: true, // Ensure this matches your Prisma schema
        firstName: true, // Use correct casing (firstName)
        lastName: true,
        email: true,
        role: true,
        status: true,
        departments: true, // Add if necessary
      },
    });
    return employees;
  }),

  // Fetch employee by ID
  getEmployeeById: protectedProcedure
    .input(z.object({ id: z.number() })) // Use `z.number()` if `id` is a number in your schema
    .query(async ({ input }) => {
      const employee = await db.user.findUnique({
        where: { id: input.id }, // Ensure type matches (number or string)
      });
      if (!employee) throw new Error("Employee not found");
      return employee;
    }),
});
