"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import { clearAuthData } from "@/app/utils/authUtil"

const navigation = [
  { name: "Dashboard", href: "/AdminUI/AdminDashBoard" },
  { name: "Collection", href: "/AdminUI/AdminDashBoard/Features/AdminCollection" },
  { name: "Inventory", href: "/AdminUI/AdminDashBoard/Features/AdminInventory" },
  { name: "Appointment", href: "/AdminUI/AdminDashBoard/Features/AdminAppointment" },
  { name: "Reports", href: "/AdminUI/AdminDashBoard/Features/AdminReports" },
  { name: "Users", href: "/AdminUI/AdminDashBoard/Features/AdminUsers" },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const pathname = usePathname() 


  const isActive = (href: string) => {
    const pathParts = pathname.split("/")
    const hrefParts = href.split("/")
  
    // Dashboard (no /Features/)
    if (!href.includes("/Features/")) {
      return pathname === href
    }
  
    // Get module name (e.g., AdminCollection)
    const currentModule = pathParts[4]
    const targetModule = hrefParts[4]
  
    return currentModule === targetModule
  }
  const handleLogout = async () => {
    try {
      await fetch('/API/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore network/logout endpoint errors and still clear client auth state.
    } finally {
      clearAuthData()
      window.location.href = '/Login'
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-lg mb-1 opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <Link href="/AdminUI/AdminDashBoard" className="flex items-center space-x-2 flex-shrink-0">
            <Image
              src="/UI/img/BiocellaLogo.png"
              alt="Scientific laboratory research"
              className="w-10 h-10 rounded-tl-2xl rounded-bl-2xl object-cover"
              width={40}
              height={40}
            />
            <span className="text-2xl font-bold text-gray-800">BIOCELLA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? "text-[#113F67] font-semibold"
                    : "text-[#113F67] hover:text-[#113F67]/70"
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#113F67] rounded-full"></span>
                )}
              </Link>
            ))}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  isActive("/AdminUI/AdminDashBoard/Features/AdminUserProfile")
                    ? "text-[#113F67] font-semibold"
                    : "text-[#113F67] hover:text-[#113F67]/70"
                }`}
              >
                Profile
                {isActive("/AdminUI/AdminDashBoard/Features/AdminUserProfile") && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#113F67] rounded-full"></span>
                )}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg py-2 z-50">
                  <Link
                    href="/AdminUI/AdminDashBoard/Features/AdminUserProfile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-[#113F67] hover:text-white"
                  >
                    My Profile
                  </Link>
                  <button
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-red-600 hover:text-white"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-[#113F67] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#113F67]"
            >
              {mobileMenuOpen ? <X className="h-6 w-6 text-[#113F67]" /> : <Menu className="h-6 w-6 text-[#113F67]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden px-2 pt-2 pb-3 bg-white border-t border-gray-200">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                isActive(item.href)
                  ? "text-white bg-[#113F67]"
                  : "text-[#113F67] hover:bg-[#113F67] hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}

          {/* Mobile Profile */}
          <div className="mt-2 border-t border-gray-200 pt-2">
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                isActive("/AdminUI/AdminDashBoard/Features/AdminUserProfile")
                  ? "text-white bg-[#113F67]"
                  : "text-[#113F67] hover:bg-[#113F67] hover:text-white"
              }`}
            >
              Profile
            </button>
            {profileOpen && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  href="/AdminUI/AdminDashBoard/Features/AdminUserProfile"
                  className="block px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-[#113F67] hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-red-600 hover:text-white"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
