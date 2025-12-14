import React, { useState } from 'react';

const JarvisCalendar = ({ onDateSelect, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 = Sunday
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (e, day) => {
    e.stopPropagation();
    // Format: YYYY-MM-DD
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Adjust for timezone offset to ensure YYYY-MM-DD is correct locally
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
    const dateString = localDate.toISOString().split('T')[0];
    
    onDateSelect(dateString);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  // Adjust firstDay: US starts Sun (0), EU starts Mon (1). Let's assume Mon start for Greece/EU standards? 
  // Actually, standard JS 0=Sunday. Let's render standard Sunday start for simplicity, or rotate for Monday.
  // Let's stick to standard layout (Sun-Sat) for grid alignment.

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8"></div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    // Highlight today
    const isToday = 
      new Date().getDate() === i && 
      new Date().getMonth() === currentDate.getMonth() && 
      new Date().getFullYear() === currentDate.getFullYear();

    days.push(
      <div 
        key={i} 
        onClick={(e) => handleDayClick(e, i)}
        className={`
          h-8 flex items-center justify-center text-xs font-mono cursor-pointer border border-transparent hover:border-cyan/50 rounded
          ${isToday ? 'bg-cyan text-black font-bold shadow-[0_0_10px_cyan]' : 'text-cyan/70 hover:bg-cyan/10'}
        `}
      >
        {i}
      </div>
    );
  }

  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  return (
    <div 
        className="absolute bottom-[160px] left-1/2 transform -translate-x-1/2 w-64 bg-black border border-cyan/50 shadow-[0_0_30px_rgba(0,229,255,0.3)] rounded-lg p-3 z-[150]"
        onClick={(e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-cyan/30">
            <button onClick={handlePrevMonth} className="text-cyan hover:text-white px-2"><i className="fas fa-chevron-left"></i></button>
            <span className="font-orbitron font-bold text-cyan tracking-widest">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={handleNextMonth} className="text-cyan hover:text-white px-2"><i className="fas fa-chevron-right"></i></button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 text-center mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-[10px] text-cyan/40 font-bold">{d}</div>
            ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
            {days}
        </div>

        {/* Close */}
        <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-full mt-3 bg-red-900/20 text-red-500 text-[10px] py-1 hover:bg-red-900/40 border border-transparent hover:border-red-500/50 rounded"
        >
            CLOSE CALENDAR
        </button>
    </div>
  );
};

export default JarvisCalendar;