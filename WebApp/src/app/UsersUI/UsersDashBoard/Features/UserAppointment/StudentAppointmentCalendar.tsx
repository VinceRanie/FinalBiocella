'use client';

import  {AppointmentSideBar}  from './AppointmentSideBar';
import BookingAppointment from "./BookingAppointment";

export default function StudentAppointmentCalendar() {
  return(

    <div className="border border-white grid min-h-screen grid-cols-1 md:h-screen md:grid-cols-2">
    {/* ========================COLUMN 1========================== */}
    <div className="border border-white bg-white flex items-start justify-center md:items-center">
     {/* ========================COLUMN 1 START========================== */}
     <div className="w-full max-w-2xl">
       <BookingAppointment/>
     </div>
      {/* ========================COLUMN 1 END========================== */}
    </div>
    {/* ========================COLUMN 2========================== */}
    <div className="border border-white bg-white flex items-start justify-center md:items-center">
         {/* ========================COLUMN 2 START========================== */}
         <div className="w-full h-full">
           <AppointmentSideBar />
         </div>
      {/* ========================COLUMN 2 END========================== */}

    </div>
  </div>
  
  )
}
