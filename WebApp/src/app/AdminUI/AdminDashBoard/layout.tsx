// src/app/AdminUI/AdminDashBoard/layout.tsx
import Navbar from "./Components/Nav";

export default function AdminDashBoardLayout({
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
