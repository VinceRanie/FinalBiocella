
import {Microscope,AlertTriangle, CalendarClock,Users,Package,} from "lucide-react";

export default function RecentActivities(){

    const getActivityConfig = (text: string) => {
        const lower = text.toLowerCase();
    
        if (lower.includes("specimen")) {
          return { icon: Microscope, color: "text-[#113F67]", bg: "bg-purple-100" };
        }
        if (lower.includes("user")) {
          return { icon: Users, color: "text-[#113F67]", bg: "bg-green-100" };
        }
        if (lower.includes("appointment")) {
          return { icon: CalendarClock, color: "text-[#113F67]", bg: "bg-blue-100" };
        }
        if (lower.includes("chemical") || lower.includes("stock")) {
          return { icon: Package, color: "text-[#113F67]", bg: "bg-orange-100" };
        }
    
        return { icon: AlertTriangle, color: "text-[#113F67]", bg: "bg-gray-100" };
      };
    
      // =========================
      // DATA
      // =========================
     
      const activities = [
        { text: "New specimen added — Amoeba proteus", time: "2 min ago" },
        { text: "User registered — Maria Santos", time: "18 min ago" },
        { text: "Appointment approved — Lab Room 3", time: "1 hr ago" },
        { text: "Chemical stock updated — Ethanol 95%", time: "2 hrs ago" },
        { text: "Specimen archived — Paramecium sp.", time: "3 hrs ago" },
        { text: "Appointment completed — Dr. Reyes", time: "5 hrs ago" },
      ];

      return (
        <>
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ACTIVITY */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
  
            <div className="space-y-3">
              {activities.map((a, i) => {
                const config = getActivityConfig(a.text);
                const Icon = config.icon;
  
                return (
                  <div
                    key={a.text}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    {/* ICON */}
                    <div
                      className={`h-8 w-8 flex items-center justify-center rounded-md ${config.bg}`}
                    >
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
  
                    {/* TEXT */}
                    <div>
                      <p className="text-sm text-gray-900">{a.text}</p>
                      <p className="text-xs text-gray-500">{a.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
      </div>
        </>
      )
     
    
}