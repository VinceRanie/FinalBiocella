
import {Microscope,FlaskConical,AlertTriangle, CalendarClock,Users,} from "lucide-react";

const cards = [
    {
      title: "Total Specimens",
      value: "1,248",
      sub: "+12 this week",
      icon: Microscope,
      trend: "up",
    },
    {
      title: "Chemical Stocks",
      value: "342",
      sub: "Available items",
      icon: FlaskConical,
      trend: "neutral",
    },
    {
      title: "Low Stock Alerts",
      value: "8",
      sub: "Requires attention",
      icon: AlertTriangle,
      trend: "warning",
    },
    {
      title: "Pending Appointments",
      value: "15",
      sub: "3 today",
      icon: CalendarClock,
      trend: "neutral",
    },
    {
      title: "Registered Users",
      value: "64",
      sub: "+5 this month",
      icon: Users,
      trend: "up",
    },
  ];


export default function SummaryCards(){
    return (
    <>
      <div className="w-full min-h-screen p-6 bg-gray-50">
      {/* HEADER */}
      <h1 className="text-2xl font-bold text-[#113F67]">Dashboard</h1>
      <p className="text-sm text-[#113F67] mb-6">
        Laboratory Information & Inventory Management
      </p>

      {/* ========================= */}
      {/* CARDS */}
      {/* ========================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p
                  className={`text-xs ${
                    card.trend === "warning"
                      ? "text-yellow-500"
                      : card.trend === "up"
                      ? "text-green-500"
                      : "text-gray-400"
                  }`}
                >
                  {card.sub}
                </p>
              </div>

              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100">
                <card.icon className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </div>
        ))}
        </div>
        </div>
</>
    )
}