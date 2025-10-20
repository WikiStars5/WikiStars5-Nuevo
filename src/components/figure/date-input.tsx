'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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
  const [era, setEra] = React.useState<'DC' | 'AC'>('DC');

  React.useEffect(() => {
    if (value) {
      if (value.startsWith('-')) {
        setEra('AC');
        setYear(value.substring(1));
        setDay('');
        setMonth('');
      } else {
        setEra('DC');
        const parts = value.split('-');
        if (parts.length === 3) {
          setYear(parts[0]);
          setMonth(parts[1]);
          setDay(parts[2]);
        }
      }
    } else {
      setEra('DC');
      setDay('');
      setMonth('');
      setYear('');
    }
  }, [value]);

  const handleDateChange = (newEra: 'AC' | 'DC', newYear: string, newMonth: string, newDay: string) => {
    if (newEra === 'AC') {
      if (newYear) {
        onChange(`-${newYear}`);
      } else {
        onChange('');
      }
    } else { // DC
      if (newYear && newMonth && newDay) {
        onChange(`${newYear}-${newMonth}-${newDay}`);
      } else {
        onChange('');
      }
    }
  };

  const handleEraChange = (newEra: 'AC' | 'DC') => {
    setEra(newEra);
    handleDateChange(newEra, year, month, day);
  };
  
  const handleDayChange = (newDay: string) => {
    setDay(newDay);
    handleDateChange(era, year, month, newDay);
  };
  
  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    handleDateChange(era, year, newMonth, day);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setYear(newYear);
    handleDateChange(era, newYear, month, day);
  };

  return (
    <div className="space-y-3">
        <RadioGroup
            value={era}
            onValueChange={(val: 'AC' | 'DC') => handleEraChange(val)}
            className="flex items-center space-x-4"
        >
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="DC" id="dc" />
                <Label htmlFor="dc">d. C.</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="AC" id="ac" />
                <Label htmlFor="ac">a. C.</Label>
            </div>
        </RadioGroup>

        <div className="grid grid-cols-3 gap-2">
            {era === 'DC' ? (
                <>
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
                </>
            ) : (
                <div className="col-span-2"></div>
            )}

            <Input
                type="text"
                placeholder="Año"
                value={year}
                onChange={handleYearChange}
                pattern="[0-9]*"
                title="Introduce solo el número del año."
            />
        </div>
    </div>
  );
}
