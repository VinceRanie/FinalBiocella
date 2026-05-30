import StudentAppointmentCalendar from "./StudentAppointmentCalendar";
import { AppointmentProvider } from "./AppointmentContext";

export default function UserAppointmentPage(){
    return (
        <AppointmentProvider>
            <StudentAppointmentCalendar />
        </AppointmentProvider>
    );
}