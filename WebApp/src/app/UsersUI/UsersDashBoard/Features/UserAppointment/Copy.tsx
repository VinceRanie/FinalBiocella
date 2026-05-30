'use client';

import { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isToday, isAfter, getDay } from 'date-fns';
import TimeSlotModal from './TimeSlotModal';
import styles from './StudentAppointmentCalendar.module.css';

interface DayStatus {
  booked: number;
  available: number;
  total: number;
}

interface UnavailableDay {
  reason: string;
  unavailable: boolean;
}

export default function StudentAppointmentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [dayStatus, setDayStatus] = useState<Record<string, DayStatus>>({});
  const [unavailableDays, setUnavailableDays] = useState<Record<string, UnavailableDay>>({});
  const [maxDuration, setMaxDuration] = useState(3); // Default 3 hours
  const [loading, setLoading] = useState(true);

  // Fetch calendar overview on month change
  useEffect(() => {
    fetchCalendarOverview();
  }, [currentMonth]);

  // Fetch admin config for max duration
  useEffect(() => {
    fetchMaxDuration();
  }, []);

  const fetchMaxDuration = async () => {
    try {
      // TODO: Create this endpoint in admin config
      // const res = await fetch('/API/config/max-appointment-duration');
      // const data = await res.json();
      // setMaxDuration(data.maxDuration || 3);
      setMaxDuration(3);
    } catch (err) {
      console.error('Failed to fetch max duration:', err);
    }
  };

  const fetchCalendarOverview = async () => {
    try {
      const month = format(currentMonth, 'M');
      const year = format(currentMonth, 'yyyy');
      const res = await fetch(`/API/appointments/calendar?month=${month}&year=${year}`);
      const data = await res.json();
      
      // Build day status map
      const status: Record<string, DayStatus> = {};
      Object.entries(data.daysWithAppointments).forEach(([date, count]: any) => {
        status[date] = {
          booked: count.booked,
          available: 8 - count.booked, // 8 slots per day (9-16)
          total: 8
        };
      });
      setDayStatus(status);
      setUnavailableDays(data.daysUnavailable || {});
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch calendar overview:', err);
      setLoading(false);
    }
  };

  const getDateStatus = (date: Date): 'disabled' | 'booked' | 'partial' | 'available' => {
    // Get today's date at midnight for proper comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create a copy of the date for comparison (also at midnight)
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    const dateStr = format(date, 'yyyy-MM-dd');

    if (unavailableDays[dateStr]?.unavailable) {
      return 'disabled';
    }

    // Disable: today or past dates (minimum 1 day advance notice) and Sundays
    // Must be at least tomorrow to book
    if (compareDate <= today || getDay(date) === 0) {
      return 'disabled';
    }

    const status = dayStatus[dateStr];
    if (!status) return 'available';

    if (status.available === 0) return 'booked';
    if (status.available < 8) return 'partial';
    return 'available';
  };

  const handleDateClick = (date: Date) => {
    const status = getDateStatus(date);
    if (status === 'disabled') return;

    setSelectedDate(date);
    fetchAvailability(date);
    setShowModal(true);
  };

  const fetchAvailability = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/API/appointments/availability?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setAvailability(data);
      } else {
        // If API fails, still show modal with empty slots - user can try again
        console.warn('Failed to fetch availability:', res.status);
      }
    } catch (err) {
      console.warn('Failed to fetch availability:', err);
      // Modal will still open with empty availability
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const firstDayOfWeek = getDay(startOfMonth(currentMonth));
  const emptyDays = Array(firstDayOfWeek).fill(null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📅 Book Your Appointment</h1>
        <p>Select a date to view available time slots</p>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.dayBox} ${styles.available}`}></div>
          <span>Available</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.dayBox} ${styles.partial}`}></div>
          <span>Some Slots Available</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.dayBox} ${styles.booked}`}></div>
          <span>Fully Booked</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.dayBox} ${styles.disabled}`}></div>
          <span>Unavailable</span>
        </div>
      </div>

      {/* Calendar */}
      <div className={styles.calendar}>
        <div className={styles.monthHeader}>
          <button onClick={() => setCurrentMonth(addDays(currentMonth, -30))}>←</button>
          <h2>{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(addDays(currentMonth, 30))}>→</button>
        </div>

        {/* Weekday headers */}
        <div className={styles.weekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={styles.weekday}>{day}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className={styles.daysGrid}>
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className={styles.emptyDay} />
          ))}
          {daysInMonth.map(date => {
            const status = getDateStatus(date);
            const dateStr = format(date, 'yyyy-MM-dd');
            const dateInfo = dayStatus[dateStr];
            const blockedInfo = unavailableDays[dateStr];

            return (
              <div
                key={dateStr}
                className={`${styles.day} ${styles[status]}`}
                onClick={() => handleDateClick(date)}
                title={blockedInfo?.unavailable ? `Unavailable: ${blockedInfo.reason}` : undefined}
              >
                <div className={styles.dayNumber}>{format(date, 'd')}</div>
                {dateInfo && status !== 'disabled' && (
                  <div className={styles.slots}>
                    {status === 'booked' && <span className={styles.red}>●</span>}
                    {status === 'partial' && <span className={styles.orange}>●</span>}
                    {status === 'available' && <span className={styles.green}>○</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Slot Modal */}
      {showModal && selectedDate && availability && (
        <TimeSlotModal
          date={selectedDate}
          availability={availability}
          maxDuration={maxDuration}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchCalendarOverview();
          }}
        />
      )}
    </div>
  );
}
