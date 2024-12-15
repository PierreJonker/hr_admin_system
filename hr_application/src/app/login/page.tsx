import Navbar from "../navbar/Navbar"; // Adjust the path to your Navbar component

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-grow items-center justify-center">
        <div className="p-8 bg-white rounded shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
          <form>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="mt-1 block w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="mt-1 block w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
