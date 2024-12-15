import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("TestPass1234", 10);

  await prisma.user.upsert({
    where: { email: "hradmin@test.com" },
    update: {},
    create: {
      firstName: "HR",
      lastName: "Admin",
      telephone: "0000000000",
      email: "hradmin@test.com",
      password: hashedPassword,
      status: "Active",
    },
  });

  console.log("Superuser created!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
