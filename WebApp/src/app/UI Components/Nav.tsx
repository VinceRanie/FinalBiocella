"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import Image from "next/image"

const navigation = [
  { name: "Home", href: "#form" },
  { name: "About", href: "#AboutUs" },
  { name: "Collection", href: "#collection" },
  { name: "Features", href: "#features" },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const [activeHash, setActiveHash] = useState("#form") 

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 50 

      const sections = navigation
        .filter((item) => item.href.startsWith("#"))
        .map((item) => {
          const element = document.querySelector(item.href)
          if (!element) return null
          const top = element.getBoundingClientRect().top + window.scrollY
          return { href: item.href, top }
        })
        .filter((s): s is { href: string; top: number } => s !== null)

      const current = sections
        .reverse()
        .find((section) => scrollPosition >= section.top)

      setActiveHash(current?.href || navigation[0].href)
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("load", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("load", handleScroll)
    }
  }, [])


  return (
    <nav className="sticky top-0 z-50 bg-white shadow-lg mb-1 opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
  <Image
    src="/UI/img/BiocellaLogo.png"
    alt="Scientific laboratory research"
    className="w-10 h-10 rounded-tl-2xl rounded-bl-2xl object-cover"
    width={40}
    height={40}
  />
  <span className="text-2xl font-bold text-gray-800">BIOCELLA</span>
</Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 justify-content-center">
            {navigation.map((item) => {
              const isActive =
                item.href === "#"
                  ? pathname === "#" && (activeHash === "" || activeHash === "#")
                  : activeHash === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive ? "text-[#113F67] font-semibold" : "text-[#113F67] hover:text-[#113F67]"
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#113F67] rounded-full"></span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center rounded-b-md">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only ">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6 cursor-pointer" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6 cursor-pointer" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden cursor-pointer">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/" && (activeHash === "" || activeHash === "#")
                  : activeHash === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-white bg-[#113F67] border-l-4 border-[#113F67]"
                      : "text-[#113F67] hover:text-white hover:bg-[#113F67]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
