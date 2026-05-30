// src/app/RAStaffUI/RAStaffDashBoard/layout.tsx
import Navbar from "./Components/Nav"

export default function RAStaffDashBoardLayout({
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
