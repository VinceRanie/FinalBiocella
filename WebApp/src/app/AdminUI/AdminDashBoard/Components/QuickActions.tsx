

import {Microscope,FlaskConical, CalendarClock,QrCode} from "lucide-react";

export default function QuickActions(){
    const actions = [
        { label: "Add Specimen", icon: Microscope },
        { label: "Add Chemical Stock", icon: FlaskConical },
        { label: "Set Date Unavailable", icon: CalendarClock },
        { label: "See Reports", icon: QrCode },
      ];
  
      return (
        <>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* HEADER */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Quick Actions
        </h3>
      </div>
      {/* CONTENT */}
      <div className="grid grid-cols-2 gap-2 text-[#113F67]">
        {actions.map((a) => {
          const Icon = a.icon;

          return (
            <button
              key={a.label}
              className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-blue-200 transition-all duration-150"
            >
              <Icon className="h-4 w-4 text text-[#113F67]" />
              {a.label}
            </button>
          );
        })}
      </div>
    </div>

      </div>
        </>
      )


}