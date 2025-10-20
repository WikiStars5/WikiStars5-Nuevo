'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateInputProps {
  value?: string;
  onChange: (value: string) => void;
}

const months = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export default function DateInput({ value, onChange }: DateInputProps) {
  const [day, setDay] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [year, setYear] = React.useState('');

  React.useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    } else {
        setDay('');
        setMonth('');
        setYear('');
    }
  }, [value]);

  const handleDayChange = (newDay: string) => {
    setDay(newDay);
    if (year && month && newDay) {
      onChange(`${year}-${month}-${newDay}`);
    } else {
      onChange('');
    }
  };
  
  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    if (year && newMonth && day) {
      onChange(`${year}-${newMonth}-${day}`);
    } else {
      onChange('');
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = e.target.value;
    setYear(newYear);
    if (newYear && month && day) {
      onChange(`${newYear}-${month}-${day}`);
    } else {
      onChange('');
    }
  };


  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={day} onValueChange={handleDayChange}>
        <SelectTrigger>
          <SelectValue placeholder="Día" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 31 }, (_, i) => (
            <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
              {i + 1}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={handleMonthChange}>
        <SelectTrigger>
          <SelectValue placeholder="Mes" />
        </SelectTrigger>
        <SelectContent>
          {months.map(m => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="text"
        placeholder="Año"
        value={year}
        onChange={handleYearChange}
        pattern="-?[0-9]*"
        title="El año puede ser un número positivo o negativo."
      />
    </div>
  );
}
