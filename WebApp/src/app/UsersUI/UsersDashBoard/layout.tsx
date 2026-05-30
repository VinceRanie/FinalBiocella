import Navbar from "./Components/Nav";

export default function UserDashBoard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navbar />
      <main className="p-4">{children}</main>
    </div>
  );
}