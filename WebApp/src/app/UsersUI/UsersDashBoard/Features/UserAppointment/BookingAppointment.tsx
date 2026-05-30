'use client';

import { useState, useEffect } from "react";
import {format, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isToday, addMonths, startOfWeek, endOfWeek, isSameMonth, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useAppointmentContext } from "./AppointmentContext";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type DayStatus = "disabled" | "booked" | "partial" | "available";

export default function Booking() {
  const { createAppointment, submitting } = useAppointmentContext();

  const [month, setMonth] = useState(new Date());
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [availability, setAvailability] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

  const parseMinutes = (timeValue: string) => {
    const [hours, minutes] = timeValue.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const formatMinutes = (minutes: number) => {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const getNextAvailableOneHourSlot = (afterTime: string) => {
    const slots = Array.isArray(availability?.timeSlots) ? [...availability.timeSlots] : [];
    const afterMinutes = parseMinutes(afterTime);

    const nextSlot = slots
      .filter((slot) => slot.available && !slot.booked)
      .map((slot) => slot.time)
      .sort((a, b) => parseMinutes(a) - parseMinutes(b))
      .find((slotTime) => parseMinutes(slotTime) >= afterMinutes);

    if (!nextSlot) return null;

    return `${formatMinutes(parseMinutes(nextSlot))} - ${formatMinutes(parseMinutes(nextSlot) + 60)}`;
  };

  const getDateStatus = (currentDate: Date): DayStatus => {
    const today = new Date();
    const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateAtMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dateKey = format(currentDate, "yyyy-MM-dd");
    if (unavailableDates.has(dateKey) || dateAtMidnight <= todayAtMidnight || currentDate.getDay() === 0) return "disabled";
    return "available";
  };

  const fetchUnavailableDates = async () => {
    try {
      const res = await fetch('/API/appointments/unavailable-dates');
      if (!res.ok) return;

      const data = await res.json();
      const dates = new Set<string>();
      (Array.isArray(data) ? data : []).forEach((item: any) => {
        if (item?.unavailable_date) {
          dates.add(String(item.unavailable_date));
        }
      });
      setUnavailableDates(dates);
    } catch (err) {
      console.warn('Failed to load unavailable dates:', err);
    }
  };

  useEffect(() => {
    fetchUnavailableDates();
  }, []);

  const fetchAvailability = async (selectedDate: Date) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setLoadingAvailability(true);
    setError("");
    try {
      const res = await fetch(`/API/appointments/availability?date=${dateStr}`);
      if (!res.ok) {
        setAvailability(null);
        setError("Failed to load available times. Please try another date.");
        return;
      }
      const data = await res.json();
      setAvailability(data);
    } catch {
      setAvailability(null);
      setError("Failed to load available times. Please try another date.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleBook = async () => {
    const trimmedPurpose = purpose.trim();
    if (!date || !time || !trimmedPurpose) {
      setError("Please complete date, time, and purpose.");
      return;
    }

    if (availability?.unavailable) {
      setError("This date is unavailable.");
      return;
    }

    const allSlots = Array.isArray(availability?.timeSlots) ? availability.timeSlots : [];
    if (allSlots.length > 0) {
      const sortedSlots = [...allSlots].sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time));
      const earliestStartTime = sortedSlots[0]?.time;
      const latestStartTime = sortedSlots[sortedSlots.length - 1]?.time;
      if (earliestStartTime && latestStartTime) {
        const selectedMinutes = parseMinutes(time);
        const earliestMinutes = parseMinutes(earliestStartTime);
        const latestMinutes = parseMinutes(latestStartTime);
        if (selectedMinutes < earliestMinutes || selectedMinutes > latestMinutes) {
          setError(`Time must be within ${earliestStartTime} to ${latestStartTime}.`);
          return;
        }
      }

      const bookedHourSet = new Set(
        sortedSlots.filter((slot) => !slot.available || slot.booked).map((slot) => slot.time)
      );
      const selectedHourSlot = `${time.slice(0, 2)}:00`;
      if (bookedHourSet.has(selectedHourSlot)) {
        const nextSlot = getNextAvailableOneHourSlot(time);
        setError(nextSlot ? `Selected time overlaps with booked slots. Next available slot: ${nextSlot}.` : "Selected time overlaps with booked slots. Please choose another range.");
        return;
      }
    }

    const result = await createAppointment({ date, time, purpose: trimmedPurpose });
    if (!result.ok) {
      setError(result.message || "Failed to book appointment.");
      return;
    }

    setTime("");
    setPurpose("");
    setSuccess(result.message || "Appointment request successfully sent.");
    setError("");
  };

  return (
    <div className="border border-white p-6 space-y-6">
        <h2 className="text-2xl font-bold text-[#113F67]">Book Your Appointment</h2>
      {/* HEADER */}
      <div className="flex justify-between">
        <button onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></button>
        <h2>{format(month, "MMMM yyyy")}</h2>
        <button onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></button>
      </div>

      {/* CALENDAR */}
      <div className="grid grid-cols-7 gap-2">
        {WEEK_DAYS.map((day) => (
          <p key={day} className="text-center text-xs font-semibold text-gray-500">
            {day}
          </p>
        ))}
        {calendarDays.map((d) => {
          const status = getDateStatus(d);
          const disabled = status === "disabled" || !isSameMonth(d, month);
          return (
            <button
              key={d.toString()}
              disabled={disabled}
              onClick={() => {
                setDate(d);
                setTime("");
                fetchAvailability(d);
              }}
              className={`p-2 rounded ${
                date && isSameDay(d, date)
                  ? "cursor-pointer bg-[#113F67] text-white"
                  : "cursor-pointer bg-gray-100 text-[#113F67]"
              } ${disabled && "opacity-50"}`}
            >
              {format(d,"d")}
            </button>
          );
        })}
      </div>

      {/* PURPOSE */}
      <div className="space-y-2">
        <label htmlFor="purpose" className="block text-md font-bold text-[#113F67]">
          Purpose
        </label>
        <input
          id="purpose"
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Enter appointment purpose"
          className="w-full pl-5 pr-2 py-2 border-border-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
        />
      </div>

      {/* TIME */}
      {date && (
        <div className="space-y-2">
          <label htmlFor="time" className="cursor-pointer block text-sm font-bold text-[#113F67]">
            Time
          </label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            min={availability?.timeSlots?.[0]?.time || undefined}
            max={availability?.timeSlots?.length ? availability.timeSlots[availability.timeSlots.length - 1].time : undefined}
            className="cursor-pointer w-full pl-5 pr-2 py-2 border-border-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
          />
          {loadingAvailability && <p className="text-xs text-gray-500">Loading availability...</p>}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* BUTTON */}
      <button onClick={handleBook}
        disabled={submitting}
        className="cursor-pointer w-full py-3 bg-[#113F67] text-white rounded flex items-center justify-center gap-2">
        <Check /> {submitting ? "Submitting..." : "Send Request"}
      </button>
    </div>
  );
}