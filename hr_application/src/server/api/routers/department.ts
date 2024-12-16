import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const departmentRouter = createTRPCRouter({
  // Fetch all departments
  getAllDepartments: protectedProcedure.query(async () => {
    const departments = await db.department.findMany({
      select: { id: true, name: true },
    });
    return departments;
  }),
});
