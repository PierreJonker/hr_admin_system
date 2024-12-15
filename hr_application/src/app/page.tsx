
import { auth } from "~/server/auth";

export default async function HomePage() {
  const session = await auth();
  return (
      <section className="flex flex-col items-center justify-center flex-grow">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Welcome to the HR Admin System</h1>
        <p className="text-gray-700 mb-8">
          Manage employees, departments, and more with ease.
        </p>
        <a
          href="/login"
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition"
        >
          Get Started {session?.user.firstname}
        </a>
      </section>
  );
}
