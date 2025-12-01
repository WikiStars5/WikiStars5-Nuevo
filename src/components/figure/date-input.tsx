
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/LanguageContext';

interface DateInputProps {
  value?: string;
  onChange: (value: string) => void;
}

export default function DateInput({ value, onChange }: DateInputProps) {
  const { t } = useLanguage();
  const [day, setDay] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [year, setYear] = React.useState('');
  const [era, setEra] = React.useState<'DC' | 'AC'>('DC');

  const months = React.useMemo(() => [
    { value: '01', label: t('EditFigure.dateInput.months.january') },
    { value: '02', label: t('EditFigure.dateInput.months.february') },
    { value: '03', label: t('EditFigure.dateInput.months.march') },
    { value: '04', label: t('EditFigure.dateInput.months.april') },
    { value: '05', label: t('EditFigure.dateInput.months.may') },
    { value: '06', label: t('EditFigure.dateInput.months.june') },
    { value: '07', label: t('EditFigure.dateInput.months.july') },
    { value: '08', label: t('EditFigure.dateInput.months.august') },
    { value: '09', label: t('EditFigure.dateInput.months.september') },
    { value: '10', label: t('EditFigure.dateInput.months.october') },
    { value: '11', label: t('EditFigure.dateInput.months.november') },
    { value: '12', label: t('EditFigure.dateInput.months.december') },
  ], [t]);


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
    const validDay = newDay;
    setDay(validDay);
    handleDateChange(era, year, month, validDay);
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
                <Label htmlFor="dc">{t('EditFigure.dateInput.eraAD')}</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="AC" id="ac" />
                <Label htmlFor="ac">{t('EditFigure.dateInput.eraBC')}</Label>
            </div>
        </RadioGroup>

        <div className="grid grid-cols-3 gap-2">
            {era === 'DC' ? (
                <>
                <Select value={day} onValueChange={handleDayChange}>
                    <SelectTrigger>
                    <SelectValue placeholder={t('EditFigure.dateInput.day')} />
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
                    <SelectValue placeholder={t('EditFigure.dateInput.month')} />
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
                placeholder={t('EditFigure.dateInput.year')}
                value={year}
                onChange={handleYearChange}
                pattern="[0-9]*"
                title="Introduce solo el número del año."
            />
        </div>
    </div>
  );
}
