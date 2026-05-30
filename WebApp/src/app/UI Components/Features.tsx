"use client"
import { TestTube, Database, FlaskConical, CalendarDays, Users, Globe } from "lucide-react"
import { motion } from "framer-motion";

export default function Features() {
  const features = [
    {
        icon: Database,
        title: "Digital Repository",
        description: "Comprehensive digital database with searchable metadata and genomic sequences.",
        color: "green",
    },
    {
     
      icon: Users,
      title: "Role-Based Access Control",
      description: "Global network of researchers sharing knowledge and resources for breakthrough discoveries.",
      color: "cyan",
    },
    {
      icon: FlaskConical,
      title: "Culture Maintenance",
      description: "Professional preservation and cultivation services for long-term specimen viability.",
      color: "purple",
    },
    {
        icon: Globe,
      title: "Remote Access",
      description: "Worldwide shipping and digital access to collections for international research projects.",
      color: "teal",
    },
    {
        icon: TestTube,
        title: "Inventory System",
        description: "State-of-the-art electron and fluorescence microscopy for detailed microorganism analysis.",
        color: "blue",
    },
    {
        icon: CalendarDays,
        title: "Laboratory Appointment System",
        description: "Rigorous quality control protocols ensuring specimen authenticity and purity.",
        color: "red",
    },
  ]

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600",
      green: "bg-green-100 text-green-600 group-hover:bg-green-600",
      purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-600",
      red: "bg-red-100 text-red-600 group-hover:bg-red-600",
      cyan: "bg-cyan-100 text-cyan-600 group-hover:bg-cyan-600",
      amber: "bg-amber-100 text-amber-600 group-hover:bg-amber-600",
      orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-600",
      teal: "bg-teal-100 text-teal-600 group-hover:bg-teal-600",
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  return (
    <motion.section 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: .5 }}
    viewport={{ once: false }} 
    id="features" className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[#113F67] mb-4">Features</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover our comprehensive suite of tools and services designed to advance microorganism research and
            accelerate scientific breakthroughs.
          </p>
          <div className="w-24 h-1 bg-[#113F67] mx-auto rounded-full mt-6"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const colorClasses = getColorClasses(feature.color)

            return (
              <div
                key={index}
                className="group bg-gray-50 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-200"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${colorClasses} flex items-center justify-center mb-4 transition-all duration-300`}
                >
                  <Icon className="w-6 h-6 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-[#113F67] mb-3 group-hover:text-[#113F67]">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed group-hover:text-[#113F67]">{feature.description}</p>
              </div>
            )
          })}
        </div>
        </div>
     </motion.section>
  )
}
