import Navbar from "./navbar/Navbar";

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <section className="flex flex-col items-center justify-center flex-grow">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Welcome to the HR Admin System</h1>
        <p className="text-gray-700 mb-8">
          Manage employees, departments, and more with ease.
        </p>
        <a
          href="/login"
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition"
        >
          Get Started
        </a>
      </section>
    </main>
  );
}
